#!/usr/bin/env python3
"""Translate every Euclid source paragraph while preserving its provenance.

English Heath text is imported from a separately verified local CUDA run of
the Apache-2.0 Helsinki-NLP/opus-mt-en-zh model; a small number of introductory
passages may instead use Microsoft Translator or explicit human-reviewed
renderings.  Historical Chinese uses Microsoft Translator's dedicated public
literary-Chinese support directly, never an English pivot.  Google Translate
remains an optional alternative when reachable.  Every completed paragraph is
appended to a durable JSONL cache so interrupted runs can resume safely.

This script needs the existing requests package; it never requests, stores, or
prints account credentials.  Source texts and exact original English remain in
euclid-data.json and are never overwritten.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import tempfile
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


REPO = Path(__file__).resolve().parents[1]
SOURCE_PATH = REPO / "src" / "lib" / "euclid-data.json"
OUTPUT_PATH = REPO / "src" / "lib" / "euclid-modern-zh.json"
GOOGLE_HOSTS = (
    "https://translate.googleapis.com/translate_a/single",
    "https://translate.google.com/translate_a/single",
)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SEGMENT_TOKEN = re.compile(r"ZXQSEG(\d{6})ZXQ")
PROTECTED_TOKEN = re.compile(r"ZXQ(?:LINK|MATH|POINT)(\d{7})ZXQ")
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(/principles/[^\)]+\)")
MATH_SPAN = re.compile(r"\$\$[^$]+\$\$|\$[^$\n]+\$|\\\([^\n]*?\\\)|\\\[[^\n]*?\\\]")
HISTORICAL_REFERENCE = re.compile(r"〈[^〉]{1,100}〉")
ANCIENT_POINT = re.compile(r"[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]+")
CONSTRUCTION_PARAGRAPH = re.compile(
    r"^(?:(?:for\s+)?let\b|with\s+centre\b|with\s+center\b|"
    r"on\s+(?:the|a|an)\s+given\b|from\s+(?:the|a|an)\s+given\b|"
    r"describe\b|construct\b|produce\b|draw\b)",
    re.IGNORECASE,
)
CONCLUSION_PARAGRAPH = re.compile(
    r"\bQ\.?\s*E\.?\s*[DF]\.?|what it was required to (?:do|prove|show)|therefore\s+etc\.?",
    re.IGNORECASE,
)

ANCIENT_REPLACEMENTS = (
    ("三边直角形", "直角三角形"),
    ("对直角边", "斜边"),
    ("直角方形", "正方形"),
    ("直角形", "矩形"),
    ("平行方形", "平行四边形"),
    ("平边三角形", "等边三角形"),
    ("平边形", "等边图形"),
    ("平边", "等边"),
    ("三边形", "三角形"),
    ("角形", "三角形"),
    ("馀两边", "另外两条边"),
    ("两平分", "平分"),
    ("平分半线", "半线段"),
    ("函心", "包含圆心"),
    ("圜心", "圆心"),
    ("圜分", "圆弧"),
    ("圜界", "圆周"),
    ("圜径", "圆的直径"),
    ("圜", "圆"),
    ("羃", "平方"),
    ("聨", "连接"),
    ("偕", "与"),
    ("俱", "都"),
    ("并等", "之和相等"),
    ("题言", "命题说明"),
    ("论曰", "证明如下："),
    ("解曰", "解释如下："),
    ("法曰", "作图方法如下："),
)

ENGLISH_CORRECTIONS = (
    ("垂直对角", "对顶角"),
    ("垂直相对角", "对顶角"),
    ("垂直相对的角", "对顶角"),
    ("垂直相反的角", "对顶角"),
    ("垂直相反", "对顶"),
    ("交替角", "内错角"),
    ("替代角", "内错角"),
    ("公设的", "公设的"),
    ("共同概念", "公理"),
    ("比率", "比"),
    ("可交换的", "可公度的"),
    ("不可通约", "不可公度"),
    ("可通约", "可公度"),
    ("按比例中项", "比例中项"),
    ("大得多", "更大"),
    ("小得多", "更小"),
    ("因此等等。", "由此命题得证。"),
)

# A small set of propositions are hand-reviewed because literal machine
# translation can reverse an inequality or omit that Euclid compares sums of
# lengths/areas.  These are faithful modern renderings of the immediately
# adjacent authentic paragraphs; every original citation remains verbatim.
EDITORIAL_STATEMENTS = {
    "euclid-1-def-15": "圆是由一条线围成的平面图形；从图形内部一点引到这条边界线上各点的所有线段都彼此相等。",
    "euclid-1-1": "在给定的有限线段上，作一个等边三角形。",
    "euclid-1-4": "如果两个三角形的两组对应边分别相等，并且这两组边所夹的角相等，那么两个三角形全等，对应底边与其余对应角也分别相等。",
    "euclid-1-21": (
        "在三角形的一条边上，从该边两个端点分别向三角形内部作两条相交线段，"
        "则这两条内侧线段的长度之和小于原三角形其余两边的长度之和；"
        "它们所夹的角大于原三角形对应的角。"
    ),
    "euclid-1-27": "如果一条直线与两条直线相交所成的内错角相等，那么这两条直线互相平行。",
    "euclid-1-47": "在直角三角形中，斜边上所作正方形的面积等于两条直角边上所作正方形的面积之和。",
    "euclid-2-5": "设线段 AB 在 C 点被平分，又在 D 点被分成不等的两段。那么以 AD、DB 为边的矩形面积，加上以 CD 为边的正方形面积，等于以半段 CB 为边的正方形面积。",
    "euclid-2-6": "设线段 AB 在 C 点被平分，并将它向 B 的方向延长到 D。那么以 AD、BD 为边的矩形面积，加上以半段 CB 为边的正方形面积，等于以 CD 为边的正方形面积。",
    "euclid-3-31": "在同一个圆中，半圆所对的圆周角是直角；大于半圆的弓形所对的圆周角小于直角，小于半圆的弓形所对的圆周角大于直角。此外，大弓形的弓形角大于直角，小弓形的弓形角小于直角。",
    "euclid-4-10": "作一个等腰三角形，使它的每个底角都等于顶角的两倍。",
    "euclid-5-def-5": "如果对第一量与第三量任取相同倍数，同时对第二量与第四量任取相同倍数，所得倍量总是对应地同时大于、同时等于或同时小于，那么第一量与第二量之比等于第三量与第四量之比。",
    "euclid-5-18": "如果若干量在分比变换后仍成比例，那么它们在合比变换后也成比例。",
    "euclid-6-20": "相似多边形可以分成数量相等且对应相似的三角形；对应三角形的面积之比等于原多边形的面积之比，而相似多边形的面积之比等于对应边长之比的平方。",
    "euclid-6-30": "把给定线段分成两部分，使整条线段与较长部分之比，等于较长部分与较短部分之比。",
    "euclid-7-2": "给定两个不互素的正整数，求它们的最大公约数。",
    "euclid-7-31": "任何合数都能被某个素数整除。",
    "euclid-8-2": "给定一个比例和所需的项数，求满足该连比例关系的一组最小正整数。",
    "euclid-9-20": "素数的个数多于任意给定的有限个数，因此素数有无穷多个。",
    "euclid-10-33": "求两条平方不可公度的线段，使它们的平方和为有理面积，而以它们为边的矩形面积为中项无理量。",
    "euclid-10-54": "如果一个矩形由一条有理线段与第一类二项无理线段围成，那么与该矩形等面积的正方形的边，是一条称为二项无理线段的无理线段。",
    "euclid-10-112": "把有理线段的平方所对应的面积应用到二项无理线段上，所得宽度是一条截差无理线段；它的各项与二项无理线段的对应项可公度，并且对应项成相同的比例。所得截差无理线段与原二项无理线段属于同一类别。",
    "euclid-11-21": "构成任意立体角的各个平面角之和，小于四个直角之和。",
    "euclid-12-2": "两个圆的面积之比，等于它们直径的平方之比。",
    "euclid-13-18": "在同一个给定球内作五种正多面体，确定并比较它们的棱长。",
}

EDITORIAL_HISTORICAL_STATEMENTS = {
    "euclid-2-5": (
        "设线段先在中点平分，再另取一点分成不等的两段；"
        "以这两段为边的矩形面积，加上两个分点之间线段的平方，等于半条原线段的平方。"
    ),
    "euclid-3-31": (
        "半圆所对的圆周角是直角；大于半圆的弓形所对的圆周角小于直角，"
        "小于半圆的弓形所对的圆周角大于直角。大弓形的弓形角大于直角，小弓形的弓形角小于直角。"
    ),
    "euclid-4-10": "作一个等腰三角形，使它的两个底角分别等于顶角的两倍。",
}

EDITORIAL_PROOF: dict[str, dict[int, str]] = {
    "euclid-1-1": {
        9: "这正是所要求作的图形；作图完成。",
    },
    "euclid-2-5": {
        0: "设直线 AB 在点 C 处被平分，在点 D 处被不等分；我断言：由 AD、DB 所作矩形与 CD 上的正方形之和，等于 CB 上的正方形。",
    },
    "euclid-3-31": {
        0: "设 ABCD 为圆，BC 为其直径，E 为圆心，并连接 BA、AC、AD、DC。我断言：半圆 BAC 中的角 BAC 是直角；大于半圆的弓形 ABC 中的角 ABC 小于直角；小于半圆的弓形 ADC 中的角 ADC 大于直角。",
    },
    "euclid-4-10": {
        0: "任取直线 AB，在点 C 处分割，使由 AB、BC 所作矩形等于 CA 上的正方形。[[II. 11](/principles/euclid-2-11)] 以 A 为圆心、AB 为半径作圆 BDE；由于 AC 不大于圆 BDE 的直径，在此圆中作弦 BD，使 BD 等于 AC。[[IV. 1](/principles/euclid-4-1)]",
    },
    "euclid-5-18": {
        0: "设量 AE、EB、CF、FD 满足分比关系，即 AE 与 EB 之比等于 CF 与 FD 之比。我断言，它们也满足合比关系，即 AB 与 BE 之比等于 CD 与 FD 之比。",
    },
    "euclid-13-18": {
        0: "设 AB 为给定球的直径；在点 C 处分割 AB，使 AC 等于 CB，再取点 D，使 AD 等于 DB 的两倍。以 AB 为直径作半圆 AEB；过 C、D 分别作 CE、DF 垂直于 AB，并连接 AF、FB、EB。",
    },
    "euclid-1-21": {
        0: "在三角形 ABC 的一条边 BC 上，从端点 B、C 分别作线段 BD、DC，使它们在三角形内部交于点 D。",
        1: "要证明：BD 与 DC 的长度之和小于 BA 与 AC 的长度之和，并且角 BDC 大于角 BAC。",
        2: "将线段 BD 延长，直到与边 AC 相交于点 E。",
        3: "因为任意三角形的两边之和大于第三边 [[I. 20](/principles/euclid-1-20)]，所以在三角形 ABE 中，AB 与 AE 的长度之和大于 BE。",
        4: "在不等式两边同时加上线段 EC，得到 BA 与 AC 的长度之和大于 BE 与 EC 的长度之和。",
        5: "又因为在三角形 CED 中，CE 与 ED 的长度之和大于 CD，所以两边同时加上 DB，可得 CE 与 EB 的长度之和大于 CD 与 DB 的长度之和。",
        6: "已经证明 BA 与 AC 的长度之和大于 BE 与 EC 的长度之和，因此更可推出 BA 与 AC 的长度之和大于 BD 与 DC 的长度之和。",
        7: "因为任意三角形的外角大于与它不相邻的内角 [[I. 16](/principles/euclid-1-16)]，所以在三角形 CDE 中，外角 BDC 大于角 CED。",
        8: "同理，在三角形 ABE 中，外角 CEB 大于角 BAC。又已证明角 BDC 大于角 CEB，因此角 BDC 也大于角 BAC。",
        9: "由此命题得证。",
        10: "证毕。",
    },
    "euclid-1-27": {
        0: "设直线 EF 与两条直线 AB、CD 相交，并且所成的内错角 AEF 与 EFD 相等。",
        1: "要证明：直线 AB 平行于直线 CD。",
        2: "假如不平行，那么 AB 与 CD 延长之后，必定或者沿着 B、D 的方向相交，或者沿着 A、C 的方向相交。",
        3: "先设它们沿着 B、D 的方向延长后相交于点 G。",
        4: "这样，在三角形 GEF 中，外角 AEF 就等于与它不相邻的内角 EFG；但这是不可能的 [[I. 16](/principles/euclid-1-16)]。",
        5: "因此，直线 AB 与 CD 沿着 B、D 的方向延长后不会相交。",
        6: "同理可证，它们沿着 A、C 的方向延长后也不会相交。",
        7: "在两个方向上都不相交的直线互相平行 [[Def. 23](/principles/euclid-1-def-23)]，因此 AB 平行于 CD。",
        8: "由此命题得证。",
        9: "证毕。",
    },
    "euclid-1-47": {
        0: "设 ABC 为直角三角形，其中角 BAC 是直角。",
        1: "要证明：以斜边 BC 为边所作正方形的面积，等于分别以直角边 BA、AC 为边所作两个正方形的面积之和。",
        2: "分别以 BC、BA、AC 为边作正方形 BDEC、GB、HC [[I. 46](/principles/euclid-1-46)]；过点 A 作 AL，令它平行于 BD 或 CE，并连接 AD、FC。",
        3: "因为角 BAC 与角 BAG 都是直角，所以在直线 BA 上的点 A 处，不在同侧的直线 AC、AG 形成的相邻两角之和等于两个直角；因此 CA 与 AG 在同一条直线上 [[I. 14](/principles/euclid-1-14)]。",
        4: "同理，BA 与 AH 也在同一条直线上。",
        5: "因为角 DBC 与角 FBA 都是直角，所以它们相等；在两角上分别加上角 ABC，可得整个角 DBA 等于整个角 FBC [[C.N. 2](/principles/euclid-1-cn-2)]。",
        6: "又因为 DB 等于 BC，FB 等于 BA，所以 AB、BD 两边分别等于 FB、BC 两边；并且角 ABD 等于角 FBC。因此底边 AD 等于底边 FC，三角形 ABD 与三角形 FBC 全等 [[I. 4](/principles/euclid-1-4)]。",
        7: "平行四边形 BL 的面积是三角形 ABD 面积的两倍，因为它们以 BD 为同一底边，并位于平行线 BD、AL 之间 [[I. 41](/principles/euclid-1-41)]。",
        8: "同理，正方形 GB 的面积是三角形 FBC 面积的两倍，因为它们以 FB 为同一底边，并位于平行线 FB、GC 之间 [[I. 41](/principles/euclid-1-41)]。",
        9: "相等面积的两倍仍然相等，因此平行四边形 BL 的面积等于正方形 GB 的面积。",
        10: "同理，连接 AE、BK，可以证明平行四边形 CL 的面积等于正方形 HC 的面积；因此整个正方形 BDEC 的面积等于正方形 GB 与 HC 的面积之和 [[C.N. 2](/principles/euclid-1-cn-2)]。",
        11: "其中，正方形 BDEC 作在 BC 上，正方形 GB、HC 分别作在 BA、AC 上。",
        12: "所以，斜边 BC 上所作正方形的面积等于两条直角边 BA、AC 上所作正方形的面积之和。",
        13: "由此命题得证。",
        14: "证毕。",
    },
}

EDITORIAL_HISTORICAL: dict[str, dict[int, str]] = {
    "euclid-1-6": {
        0: "如果三角形底边两端的角相等，那么与这两个角相对的两条边也相等。",
    },
    "euclid-1-7": {
        0: (
            "在同一条底边的同一侧，从底边两个端点分别引出两条线段，并使它们相交于一点。"
            "不可能再从同样的两个端点引出另外两条分别与原线段等长的线段，"
            "却让它们相交于另一个不同的点。"
        ),
    },
    "euclid-1-11": {
        0: "经过给定直线上的一个指定点，作一条与这条直线垂直的直线。",
    },
    "euclid-1-12": {
        0: "给定一条可以无限延长的直线和直线外一点，过这个点向该直线作垂线。",
    },
    "euclid-1-13": {
        0: "一条直线与另一条直线相交时形成的两个相邻角，要么都是直角，要么它们的和等于两个直角。",
    },
    "euclid-1-15": {
        0: "两条直线相交所形成的四个角中，每一对对顶角都相等。",
        3: (
            "补充命题：从同一条直线上的一点向两侧引出两条直线；"
            "如果它们与原直线所成的一对对顶角相等，那么这两条新引出的线合成一条直线。"
        ),
    },
    "euclid-1-16": {
        0: "三角形的任意一个外角，都大于与它不相邻的每一个内角。",
    },
    "euclid-1-17": {
        0: "三角形任意两个内角的和，都小于两个直角的和。",
    },
    "euclid-1-18": {
        0: "在任何三角形中，较长的边对着较大的角，较短的边对着较小的角。",
        1: (
            "设三角形甲乙丙的边甲丙大于边甲乙和边乙丙。命题要说明："
            "与较长边甲丙相对的角甲乙丙，大于与另外两边相对的角乙丙甲和角乙甲丙。"
        ),
        2: (
            "证明：因为甲丙大于甲乙，所以在甲丙上截取甲丁，使甲丁等于甲乙〈本篇三〉，"
            "并连接乙丁。由等腰三角形的两底角相等，得角甲乙丁等于角甲丁乙〈本篇五〉。"
            "角甲丁乙是三角形乙丙丁的外角，因此大于与它不相邻的内角丁丙乙〈本篇十六〉；"
            "于是角甲乙丁也大于角甲丙乙。角甲乙丙包含角甲乙丁，所以角甲乙丙更大于角甲丙乙。"
            "同理，如果边乙丙大于边甲乙，那么角乙甲丙也大于角甲丙乙。"
        ),
    },
    "euclid-1-32": {
        3: (
            "证明：因为外角甲丙丁等于三角形另外两个内角之和，再把角甲丙乙同时加到两边，"
            "就得到角甲丙丁与角甲丙乙之和，等于三角形甲乙丙三个内角之和〈公论二〉。"
            "而这两个相邻角之和等于两个直角〈本篇〉〈十三〉，所以三角形三个内角之和也等于两个直角。"
            "由此可推得：三角形内角和为两个直角，四边形为四个直角，五边形为六个直角，"
            "以后每增加一条边，内角和就增加两个直角。一般地，n 边形的内角和等于 2(n－2) 个直角。"
            "〈凡一线二线不能为形故三边〉〈为第一形四边为第二形五边为第三形六边为第四形仿此以至无穷〉"
        ),
    },
    "euclid-2-6": {
        0: (
            "把一条线段平分，再沿同一直线将它延长。"
            "由延长后的整条线段与延长部分所作矩形的面积，"
            "加上原线段一半所作正方形的面积，"
            "等于由原线段一半与延长部分组成的线段所作正方形的面积。"
        ),
    },
    "euclid-2-5": {
        0: (
            "把一条线段先平分，再另外分成不相等的两段。"
            "以这两个不相等的部分为边所作矩形的面积，"
            "加上两个分点之间那段线段所作正方形的面积，"
            "等于以原线段一半为边所作正方形的面积。"
        ),
    },
    "euclid-3-26": {
        0: (
            "在相等的圆中，相等的圆心角或圆周角所对的圆弧也相等。先讨论圆心角："
            "设甲乙丙、丁戊己为相等的圆，圆心分别为庚、辛，并且角甲庚丙等于角丁辛己。"
            "在相应圆弧上取点乙、戊，分别连接乙甲、乙丙与戊丁、戊己，再连接甲丙、丁己。"
            "因为两个圆周角分别等于相应圆心角的一半，所以角乙等于角戊〈本篇二十〉，"
            "相应圆弧甲乙丙与丁戊己因此相似〈本卷界说十〉。两个圆的对应半径甲庚、庚丙与丁辛、辛己分别相等，"
            "夹角庚、辛也相等，所以弦甲丙等于弦丁己〈一卷四〉；在等长弦上作出的相似圆弧相等〈本篇卄四〉。"
            "从两个相等的整圆中减去相等的圆弧，剩下的圆弧甲丙、丁己也相等。"
            "再讨论圆周角：若角乙等于角戊，则相应圆心角庚、辛分别为它们的两倍，因此也相等〈本篇二十〉。"
            "依照前面的证明，对应弦和圆弧分别相等〈本篇廿四〉。"
            "因此，无论相等的角位于圆心还是圆周，它们所对的圆弧都相等。"
        ),
    },
    "euclid-3-31": {
        0: (
            "半圆所对的圆周角是直角；大于半圆的弓形所对的圆周角小于直角，"
            "小于半圆的弓形所对的圆周角大于直角。"
            "设圆甲乙丙的圆心为丁，直径为甲丙；连接乙丁，并延长甲乙。"
            "由于丁乙、丁甲和丁丙都是半径，相关等腰三角形的底角分别相等〈一卷五〉；"
            "结合外角等于两个不相邻内角之和〈一卷卅二〉，得到半圆所对的角甲乙丙为直角。"
            "三角形另外两个内角因此都小于直角〈一卷十七〉。"
            "又因为圆内接四边形的对角之和等于两个直角〈本篇廿二〉，与锐角相对的圆周角必定大于直角。"
            "所以大弓形所对的圆周角是锐角，小弓形所对的圆周角是钝角；"
            "相应的大弓形角大于直角，小弓形角小于直角。"
            "古译接着从等腰三角形底角、直径作图与内接四边形分别给出其他证明，"
            "并指出：如果三角形一个内角等于另外两个内角之和，这个角必为直角。"
        ),
    },
    "euclid-4-2": {
        0: (
            "给定一个圆和一个三角形，在这个圆内作一个与给定三角形对应角相等的内接三角形。"
            "设圆为甲乙丙，给定三角形为丁戊己。先作直线庚辛，使它在甲处与圆相切〈三卷十七〉；"
            "再作角庚甲乙等于角己、角辛甲丙等于角戊，最后连接乙丙。"
            "由切线与弦所成的角等于相应圆周角，可知角甲丙乙等于角庚甲乙，"
            "角甲乙丙等于角辛甲丙〈三卷卅二〉，所以这两个角分别等于给定的角己、角戊。"
            "再根据三角形内角和，剩下的角乙甲丙等于角丁〈一卷卅二〉。"
            "因此，内接三角形甲乙丙与给定三角形丁戊己三组对应角都相等。"
        ),
    },
    "euclid-4-10": {
        0: (
            "作一个等腰三角形，使两个底角都等于顶角的两倍。"
            "先任取线段甲乙，并在丙处分割，使甲乙与丙乙所作矩形的面积等于甲丙上正方形的面积〈二卷十一〉。"
            "以甲为圆心、甲乙为半径作圆，再在圆上截取弦乙丁，使乙丁等于甲丙〈本篇一〉，最后连接甲丁。"
            "由于甲乙、甲丁都是同一圆的半径，所以三角形甲乙丁是等腰三角形。"
            "为了证明底角是顶角的两倍，连接丙丁，并作三角形甲丙丁的外接圆〈本篇五〉。"
            "根据前述矩形与正方形面积相等的关系，乙丁与外接圆在丁处相切〈三卷卅七〉；"
            "由切线与弦所成角的性质，角乙丁丙等于角丙甲丁〈三卷卅二〉。"
            "再利用三角形外角定理〈一卷卅二〉及等角所对边相等〈一卷六〉，"
            "可得角甲丁乙和角甲乙丁各自都是顶角乙甲丁的两倍。"
        ),
    },
    "euclid-6-4": {
        5: (
            "补充证明：三角形甲己乙与甲庚丁相似，三角形甲己丙与甲庚戊也相似。"
            "因此乙己与甲己之比等于丁庚与庚甲之比〈本系〉，"
            "甲己与己丙之比等于甲庚与庚戊之比。"
            "把这两组比例合并，得到乙己与己丙之比等于丁庚与庚戊之比〈五卷廿二〉。"
        ),
    },
    "euclid-6-10": {
        1: (
            "作图方法：要把线段甲乙按照另一条线段甲丙上分点丁、戊所确定的比例分段。"
            "先让甲乙与甲丙在甲处相连，形成角丙甲乙，再连接丙乙。"
            "分别过丁、戊作丁己、戊庚，使它们都平行于丙乙。"
            "于是己、庚把甲乙分成的各段，与丁、戊把甲丙分成的各段按相同的比例对应。"
        ),
    },
    "euclid-6-13": {
        0: "给定两条线段，作一条作为这两条线段比例中项的线段。",
        4: (
            "补充命题：给定一条线段，以及另一条长度大于它两倍的线段。"
            "把较长的线段分成两部分，使给定线段成为这两部分的比例中项。"
        ),
    },
    "euclid-6-22": {
        4: (
            "证明：先对线段甲乙、丙丁、戊己作第四比例项午未〈本篇十二〉，"
            "再在午未上作图形午未酉申，使它与图形戊丑相似并具有相同的对应方向〈本篇十八〉。"
            "因此午酉既与戊丑相似，也与庚卯相似。因为甲乙与丙丁之比等于戊己与午未之比，"
            "根据前面已证的结论，图形甲乙壬与丙丁癸的面积之比，等于图形戊丑与午酉的面积之比。"
            "另一方面，原来的假设给出图形甲乙壬与丙丁癸之比等于戊丑与庚卯之比，"
            "因此戊丑与午酉之比等于戊丑与庚卯之比〈五卷十一〉，从而午酉与庚卯的面积相等〈五卷九〉。"
            "这两个图形相似、对应方向相同且面积相等，所以对应边午未与庚辛相等。"
            "于是戊己与午未之比也等于戊己与庚辛之比；又因戊己与午未之比等于甲乙与丙丁之比，"
            "最终得到甲乙与丙丁之比等于戊己与庚辛之比。"
            "补充说明：如果两个相似且对应方向相同的图形面积相等，而对应边却一长一短，"
            "较长对应边所在图形的面积也会更大〈五卷十四〉，这与两图形面积相等矛盾；因此对应边必须相等。"
        ),
    },
    "euclid-6-25": {
        2: (
            "证明：因为线段丙丁、壬癸、丁庚构成连比例，根据本篇第二十题的推论，"
            "丙丁与丁庚之比等于分别作在丙丁、壬癸上的两个相似图形甲、子的面积之比。"
            "另一方面，同高平行四边形的面积之比等于它们底边之比，"
            "所以丙丁与丁庚之比也等于平行四边形丙戊与丁辛的面积之比〈本篇一〉。"
            "因此丙戊与丁辛之比等于甲与子之比。又因为丙戊与甲等积、丁辛与乙等积，"
            "所以甲与乙之比等于甲与子之比〈五卷十一〉，从而图形乙与图形子面积相等〈五卷九〉。"
        ),
    },
    "euclid-6-20": {
        0: (
            "把两个相似的直线多边形分别分成三角形时，分出的三角形个数相同，"
            "相对应的三角形彼此相似；对应三角形的面积之比等于两个多边形的面积之比。"
            "两个相似多边形的面积之比，等于它们对应边长度之比的平方。"
        ),
    },
    "euclid-6-30": {
        0: (
            "把给定线段按中末比例分成两段，使整条线段与较长部分之比，"
            "等于较长部分与较短部分之比。"
        ),
        4: (
            "另一种作法：把线段甲乙分于丙，使甲乙与丙乙所作矩形的面积，"
            "等于以甲丙为边所作正方形的面积〈二卷十一〉。"
            "于是甲乙、甲丙、丙乙构成连比例〈本篇廿七〉，因此丙就是所求的中末比例分点。"
        ),
    },
    "euclid-6-31": {
        3: (
            "补充证明：三角形甲乙丙与癸甲丙相似，所以乙丙与丙甲之比等于丙甲与丙癸之比〈本篇八〉。"
            "由相似三角形的面积比等于对应边长比的平方，"
            "三角形癸甲丙与甲乙丙的面积之比等于丙甲与乙丙之比的平方〈本篇十九〉。"
            "同理，图形丙辛与乙丁的面积之比也等于丙甲与乙丙之比的平方〈本篇十九二十〉，"
            "因此三角形癸甲丙与甲乙丙之比等于图形丙辛与乙丁之比〈五卷十一〉。"
            "同样可以证明，三角形癸乙甲与甲乙丙之比等于图形乙庚与乙丁之比。"
            "把两组比例相加〈五卷廿四〉：三角形甲癸丙与癸乙甲的面积之和，"
            "相对于整个三角形甲乙丙的面积之比，等于图形丙辛与乙庚的面积之和相对于乙丁的面积之比。"
            "前两个三角形恰好拼成整个三角形甲乙丙，所以图形丙辛与乙庚的面积之和等于图形乙丁的面积。"
        ),
    },
    "euclid-6-33": {
        18: (
            "作图方法：把给定直线图形甲分成两个图形，使它们都与给定图形丁相似并保持相同的对应方向，"
            "同时使两个新图形的面积之比等于线段乙与丙之比。"
            "先作图形戊己庚辛，使它与甲等积，并与丁相似且方向对应〈本篇廿五〉。"
            "在边戊辛上取点壬，使戊壬与壬辛之比等于乙与丙之比"
            "〈分法〉〈先以乙丙两线联为一直线次截戊壬与壬辛若乙与丙见本篇十〉。"
            "以戊辛为直径作半圆戊癸辛，过壬作垂线壬癸，再连接戊癸与癸辛。"
            "分别在戊癸、癸辛上作图形戊丑子癸、癸卯寅辛，"
            "使它们都与戊庚相似并保持对应方向〈本篇十八〉。"
            "于是这两个图形的面积之和等于甲，它们分别与丁相似，且面积之比等于乙与丙之比。"
        ),
        48: (
            "补充证明：如果丁戊、庚辛、己三条线段成连比例，那么丁戊与己之比，"
            "等于分别作在相应线段上的相似图形甲与壬的面积之比〈本篇十九二十之系〉。"
            "因此可以把给定图形按两倍、三倍、五倍等任意倍数放大，"
            "也可以按二分之一、三分之一等比例缩小，并始终保持相似和对应方向一致。"
            "例如，要作面积为正方形甲乙丙丁五倍的正方形，先延长甲乙至戊，使戊乙等于甲乙的五倍；"
            "平分甲戊于己，以己为圆心作半圆甲庚戊，再延长乙丙交半圆于庚。"
            "所得乙庚是戊乙与乙甲的比例中项〈本篇十三之系〉，"
            "因此以乙庚为边的正方形与以甲乙为边的正方形的面积之比，"
            "等于戊乙与乙甲之比〈本篇二十之系〉，即五比一。"
            "若把戊乙改为乙甲的六倍或三分之一，就分别得到原图形面积六倍或三分之一的相似图形。"
            "同样，要作面积为矩形甲乙丙丁两倍的相似矩形，令戊乙等于甲乙的两倍，"
            "用半圆作出比例中项乙庚，再截取甲辛等于乙庚，过辛作平行线并利用对角线确定新矩形甲辛壬癸。"
            "因为戊乙、乙庚、乙甲成连比例〈本篇十三之系〉，"
            "所以新矩形甲壬与原矩形甲丙的面积之比等于戊乙与乙甲之比〈本篇二十之系〉，也就是二比一。"
            "这种方法同样适用于任意相似直线图形；以乙庚、甲乙为直径所作两圆，"
            "其面积之比也等于相应线段的平方之比。"
        ),
        50: (
            "证明：因为己戊庚与乙丙平行，所以乙丁与丁丙之比等于己戊与戊庚之比〈本篇四之増题〉。"
            "合比后，乙丙与丁丙之比等于己庚与戊庚之比。"
            "又因为三角形甲丁丙与甲戊庚等角，丁丙与甲丁之比等于戊庚与甲戊之比"
            "〈甲丁丙与甲戊庚为等角形故见本〉〈篇四之系〉。"
            "把比例相乘，得到乙丙与甲丁之比等于己庚与甲戊之比。"
            "再利用甲丁与乙丙之比等于甲戊与戊丁之比，可得乙丙与自身之比等于己庚与戊丁之比，"
            "因此己庚等于戊丁。又因为己庚等于辛壬〈一卷卅四〉，"
            "而戊丁等于己辛、庚壬，所以四边己庚、庚壬、壬辛、辛己都相等。"
            "角戊丁辛是直角，因此角己辛丁也是直角〈一卷廿九〉；其余角同样是直角。"
            "所以四边形己壬是一个正方形。"
        ),
    },
    "euclid-1-1": {
        0: "在给定的有限线段上，作一个等边三角形。",
        1: (
            "证明：以甲为圆心所作圆的半径甲乙、甲丙、甲丁都相等；以乙为圆心所作圆的半径乙甲、乙丙、乙丁也都相等，"
            "因为同一圆中，从圆心到圆周的各条线段都相等〈界说十五。〉。既然乙丙等于甲乙，甲丙也等于甲乙，"
            "因此甲丙等于乙丙〈公论一。〉。三条边彼此相等，于是得到所求的等边三角形。"
            "〈凡论有二种，此以是为论者、正论也，下仿此。〉"
        ),
        2: "其他三角形的作图也可参照前述方法加以推演〈详本篇廾二。〉。",
    },
    "euclid-1-21": {
        0: (
            "如果从三角形一边的两个端点引出两条线，在其内部构成另一个三角形，"
            "那么内三角形两腰的长度之和一定小于外三角形对应两边的长度之和；"
            "这两条内侧线段所夹的角大于外三角形对应的角。"
        ),
        1: (
            "设三角形甲乙丙。从边乙丙的两个端点分别引出线段，使它们相交于点丁。"
            "命题要证明：丁丙与丁乙的长度之和小于甲乙与甲丙的长度之和，"
            "并且角乙丁丙大于角乙甲丙。"
        ),
        2: (
            "证明：将内部线段乙丁延长到戊。在三角形乙甲戊中，乙甲与甲戊的长度之和大于乙戊〈本篇二十〉。"
            "两边同时加上戊丙，得到乙甲、甲戊、戊丙的长度之和大于乙戊与戊丙的长度之和〈公论四〉。"
            "又在三角形戊丁丙中，戊丁与戊丙的长度之和大于丁丙；两边同时加上丁乙，"
            "得到戊丁、戊丙、丁乙的长度之和大于丁丙与丁乙的长度之和〈公论四〉。"
            "因此，外三角形两边乙甲、甲丙的长度之和大于内三角形两边丁丙、丁乙的长度之和〈本篇二十〉。"
            "再由三角形外角大于与它不相邻的内角〈本篇十六〉，可知角乙丁丙大于角乙甲丙。"
        ),
    },
    "euclid-1-27": {
        0: "一条直线与两条直线相交时，如果一对内错角相等，那么这两条直线平行。",
        1: (
            "设直线甲乙、丙丁被另一条直线戊己截于庚、辛，并且角甲庚辛等于角丁辛庚。"
            "命题要证明：直线甲乙平行于直线丙丁。"
        ),
        2: (
            "用反证法：如果两条直线不平行，设它们延长后交于壬，则庚、辛、壬构成三角形。"
            "由三角形外角定理，外角甲庚辛应当大于与它不相邻的内角庚辛壬〈本篇十六〉；"
            "这与先前假设两角相等矛盾。如果改用另一对内错角乙庚辛、丙辛庚，或者假设两线在另一侧交于癸，"
            "也能得到同样的矛盾。因此两条直线平行。"
        ),
    },
    "euclid-1-47": {
        0: "在直角三角形中，斜边上所作正方形的面积等于两条直角边上所作正方形的面积之和。",
        1: (
            "设甲乙丙为直角三角形，角乙甲丙为直角。在其对边乙丙上作正方形乙丙丁戊〈本篇四六〉。"
            "命题要证明：这个正方形的面积等于分别以甲乙、甲丙为边所作正方形甲乙己庚、甲丙辛壬的面积之和。"
        ),
        2: (
            "证明：过甲作直线甲癸，使它与乙戊及丙丁平行〈本篇卅一〉，并与乙丙交于子；再连接相关顶点。"
            "由于角乙甲丙与角乙甲庚都是直角，所以庚、甲、丙在同一直线上〈本篇十四〉；同理，乙、甲、壬也共线。"
            "在两个相等的直角上加同一个角，可以得到角甲乙戊等于角丙乙己〈公论二〉；同理还有对应角相等。"
            "因此，三角形甲乙戊与三角形丙乙己的两边及夹角分别相等，两个三角形全等〈本篇四〉。"
            "正方形甲乙己庚的面积是同底同高三角形丙乙己面积的两倍〈本篇四一〉；"
            "矩形乙戊癸子的面积也是全等三角形甲乙戊面积的两倍，所以这两块面积相等〈公论〉〈六〉。"
            "同理，正方形甲丙辛壬的面积等于矩形丙丁癸子的面积。将两部分相加，"
            "可得斜边上的正方形乙戊丁丙的面积，等于两个直角边上正方形甲乙己庚、甲丙辛壬的面积之和。"
            "古译随后补充：以正方形对角线为边所作正方形的面积是原正方形面积的两倍；"
            "并提出把两个不相等的正方形改作两个彼此相等、总面积不变的正方形。"
        ),
        3: (
            "作法：先作线段丙戊等于甲，并在丙处作直角，使丙丁等于乙；连接戊丁。"
            "再分别在角丙丁戊与角丙戊丁处作与直角一半相等的角，使两条线段己戊、己丁交于己〈公论十一〉。"
            "于是己戊等于己丁〈本篇六〉；分别以它们为边所作的两个正方形面积相等，"
            "而其面积之和又等于以丙戊、丙丁为边所作两个原正方形的面积之和。"
        ),
        4: (
            "证明：角己丁戊与角己戊丁都等于半个直角，所以角丁己戊是直角〈本篇卅二〉。"
            "根据本命题，斜边丁戊上所作正方形的面积等于两条直角边上正方形的面积之和〈本题〉。"
            "又因为己戊等于己丁，这两条边上所作正方形面积彼此相等。"
            "而丁戊上所作正方形又等于丙丁、丙戊上两个正方形的面积之和，"
            "因此新作两个正方形的面积之和与原来两个正方形的面积之和相等。"
            "古译进一步提出：给定多个正方形，作一个面积等于它们总面积的正方形。"
        ),
        5: (
            "作法：设五个正方形的边长分别为甲、乙、丙、丁、戊，可以相等也可以不同。"
            "先作以甲、乙为直角边的直角三角形，得到斜边己辛；再以己辛、丙为直角边作直角三角形，"
            "依次加入丁和戊，最终得到线段己子。以己子为边所作正方形的面积，"
            "正好等于这五个原正方形的面积之和。"
        ),
        6: (
            "证明：根据本命题，以己辛为边的正方形面积等于以甲、乙为边的两个正方形面积之和〈本题〉；"
            "继续加入边长丙、丁、戊时，每一步都应用同样的结论，因此可以推广到任意多个正方形。"
            "古译接着讨论：已知直角三角形两条边的长度，怎样求第三边的长度。"
        ),
        7: (
            "例如，直角三角形甲乙丙在甲处为直角。若甲乙等于 6、甲丙等于 8，"
            "则斜边乙丙的平方等于两个直角边平方之和〈本题〉：6²＋8²＝36＋64＝100，"
            "所以乙丙等于 √100＝10。反过来，若已知甲乙等于 6、斜边乙丙等于 10，"
            "则另一条直角边甲丙的平方等于 10²－6²＝100－36＝64，因此甲丙等于 √64＝8。"
            "其他边也可以同样求得；这里举的是能够恰好开平方的整数例子，不能整开时还需使用相应的计算方法。"
        ),
    },
}


@dataclass(frozen=True)
class Unit:
    key: str
    text: str
    mode: str


class TranslationInputRejected(ValueError):
    """The provider rejected this exact batch; splitting may still succeed."""


class DurableCache:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.values: dict[str, str] = {}
        self.lock = threading.Lock()
        if self.path.exists():
            for line in self.path.read_text(encoding="utf-8").splitlines():
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(record.get("key"), str) and isinstance(record.get("value"), str):
                    self.values[record["key"]] = record["value"]

    def import_file(self, path: Path, *, refresh_existing: bool = False) -> int:
        if not path.exists():
            return 0
        imported = 0
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            key, value = record.get("key"), record.get("value")
            if not isinstance(key, str) or not isinstance(value, str):
                continue
            if key not in self.values:
                self.values[key] = value
                imported += 1
            elif refresh_existing and self.values[key] != value:
                self.override(key, value)
                imported += 1
        return imported

    def save(self, key: str, value: str) -> None:
        with self.lock:
            if key in self.values:
                return
            self.values[key] = value
            with self.path.open("a", encoding="utf-8") as output:
                output.write(json.dumps({"key": key, "value": value}, ensure_ascii=False) + "\n")
                output.flush()

    def override(self, key: str, value: str) -> None:
        with self.lock:
            if self.values.get(key) == value:
                return
            self.values[key] = value
            with self.path.open("a", encoding="utf-8") as output:
                output.write(json.dumps({"key": key, "value": value}, ensure_ascii=False) + "\n")
                output.flush()


class RateLimiter:
    def __init__(self, minimum_interval: float):
        self.minimum_interval = minimum_interval
        self.lock = threading.Lock()
        self.next_request = 0.0

    def wait(self) -> None:
        with self.lock:
            now = time.monotonic()
            delay = max(0.0, self.next_request - now)
            self.next_request = max(now, self.next_request) + self.minimum_interval
        if delay:
            time.sleep(delay)

    def backoff(self, seconds: float) -> None:
        with self.lock:
            self.next_request = max(self.next_request, time.monotonic() + seconds)


class TranslationService:
    def __init__(self, minimum_interval: float):
        self.limiter = RateLimiter(minimum_interval)
        self.local = threading.local()
        self.bing_lock = threading.Lock()
        self.bing_session: requests.Session | None = None
        self.bing_key: str | None = None
        self.bing_token: str | None = None
        self.bing_ig: str | None = None
        self.bing_iid: str = "translator.5028"

    def session(self) -> requests.Session:
        existing = getattr(self.local, "session", None)
        if existing is None:
            existing = requests.Session()
            existing.headers.update({"User-Agent": USER_AGENT})
            self.local.session = existing
        return existing

    def google(self, text: str) -> str:
        last_error: Exception | None = None
        for attempt in range(9):
            host = GOOGLE_HOSTS[(attempt // 2) % len(GOOGLE_HOSTS)]
            try:
                self.limiter.wait()
                response = self.session().get(
                    host,
                    params={"client": "gtx", "sl": "en", "tl": "zh-CN", "dt": "t", "q": text},
                    timeout=(12, 70),
                )
                if response.status_code in {429, 503}:
                    retry_header = response.headers.get("Retry-After", "")
                    retry_delay = float(retry_header) if retry_header.replace(".", "", 1).isdigit() else 2**min(attempt, 5)
                    self.limiter.backoff(retry_delay + random.random())
                    raise requests.HTTPError(f"Google Translate HTTP {response.status_code}")
                response.raise_for_status()
                payload = response.json()
                translated = "".join(str(item[0]) for item in payload[0] if item and item[0])
                if not translated.strip():
                    raise ValueError("Google Translate returned empty content")
                return translated
            except (requests.RequestException, ValueError, KeyError, IndexError) as error:
                last_error = error
                if attempt >= 8:
                    break
                self.limiter.backoff(min(45.0, 0.6 * (2**attempt)) + random.random())
        raise RuntimeError(f"Google translation failed after retry: {last_error}") from last_error

    def refresh_bing(self) -> None:
        session = requests.Session()
        session.headers.update({"User-Agent": USER_AGENT})
        response = session.get("https://www.bing.com/translator", timeout=40)
        response.raise_for_status()
        key_token = re.search(r'params_AbusePreventionHelper\s*=\s*\[(\d+),\s*"([^"]+)"', response.text)
        identifier = re.search(r'IG:"([^"]+)"', response.text)
        instance = re.search(r'data-iid="(translator\.[^"]+)"', response.text)
        if not key_token or not identifier:
            raise RuntimeError("Microsoft Translator public page did not provide session metadata")
        self.bing_session = session
        self.bing_key = key_token.group(1)
        self.bing_token = key_token.group(2)
        self.bing_ig = identifier.group(1)
        self.bing_iid = instance.group(1) if instance else "translator.5028"

    def bing_translate(self, text: str, source_language: str) -> str:
        last_error: Exception | None = None
        for attempt in range(7):
            with self.bing_lock:
                try:
                    if self.bing_session is None or attempt:
                        self.refresh_bing()
                    self.limiter.wait()
                    assert self.bing_session is not None
                    response = self.bing_session.post(
                        "https://www.bing.com/ttranslatev3",
                        params={"isVertical": "1", "IG": self.bing_ig, "IID": self.bing_iid},
                        data={
                            "fromLang": source_language,
                            "text": text,
                            "to": "zh-Hans",
                            "token": self.bing_token,
                            "key": self.bing_key,
                        },
                        headers={"Referer": "https://www.bing.com/translator", "Origin": "https://www.bing.com"},
                        timeout=(12, 80),
                    )
                    if source_language == "lzh" and response.status_code == 400:
                        # Some public sessions reject the explicit lzh code;
                        # auto-detection still selects the literary model.
                        self.limiter.wait()
                        response = self.bing_session.post(
                            "https://www.bing.com/ttranslatev3",
                            params={"isVertical": "1", "IG": self.bing_ig, "IID": self.bing_iid},
                            data={
                                "fromLang": "auto-detect",
                                "text": text,
                                "to": "zh-Hans",
                                "token": self.bing_token,
                                "key": self.bing_key,
                            },
                            headers={"Referer": "https://www.bing.com/translator", "Origin": "https://www.bing.com"},
                            timeout=(12, 80),
                        )
                    if response.status_code in {401, 429, 503}:
                        self.bing_session = None
                        self.limiter.backoff(min(35.0, 1.5 * (2**attempt)) + random.random())
                        raise requests.HTTPError(f"Microsoft Translator HTTP {response.status_code}")
                    response.raise_for_status()
                    payload = response.json()
                    if isinstance(payload, dict):
                        raise TranslationInputRejected(
                            f"Microsoft Translator response: {json.dumps(payload, ensure_ascii=False)[:240]}"
                        )
                    translated = payload[0]["translations"][0]["text"]
                    if not translated.strip():
                        raise ValueError("Microsoft Translator returned empty translation")
                    return translated
                except (requests.RequestException, ValueError, KeyError, IndexError) as error:
                    if isinstance(error, TranslationInputRejected):
                        raise
                    last_error = error
        raise RuntimeError(f"Microsoft {source_language} translation failed: {last_error}") from last_error


def unit_key(mode: str, text: str) -> str:
    digest = hashlib.sha256(f"{mode}\n{text}".encode("utf-8")).hexdigest()
    return f"{mode}:{digest}"


def normalize_ancient(text: str) -> str:
    normalized = text
    for old, new in ANCIENT_REPLACEMENTS:
        normalized = normalized.replace(old, new)
    # Consecutive replacement can otherwise turn 三角形 into 三三角形.
    return normalized.replace("三三角形", "三角形")


def clean_modern(text: str) -> str:
    cleaned = text.strip()
    for old, new in ENGLISH_CORRECTIONS:
        cleaned = cleaned.replace(old, new)
    return cleaned


def normalize_historical_interpretation(source: str, modern: str) -> str:
    corrected = modern
    if re.search(r"岂不(?:更)?大", source):
        corrected = re.sub(r"不(?:会)?大于", "大于", corrected)
        corrected = corrected.replace("不是更大", "更大")
    if re.search(r"岂不(?:相)?等", source):
        corrected = corrected.replace("不相等", "相等")
    if source.startswith("于有界直线上"):
        corrected = corrected.replace("找到一个等边三角形", "作一个等边三角形")
    return corrected


def repair_historical_artifacts(source: str, modern: str) -> str:
    repaired = normalize_historical_interpretation(source, modern)
    # Microsoft's literary model can invent or duplicate a compact point/ref
    # marker even after all genuine markers have already been restored.  An
    # invented identifier has no source referent, so remove it rather than
    # guessing a point name.  The complete ancient paragraph remains visible
    # immediately above the interpretation for direct verification.
    repaired = re.sub(r"\b[PR]\s*(?:边|点|号|第)?\s*\d{3,4}\b", "", repaired)
    if "等" in source:
        repaired = repaired.replace("等等。", "相等。")
    repaired = repaired.replace("基数", "底边")
    repaired = repaired.replace("半元素线", "原线段的一半")
    repaired = repaired.replace("半成员线", "原线段的一半")
    repaired = repaired.replace("：:", "：")
    repaired = re.sub(r"(?<=〉)\d+(?=\D|$)", "", repaired)
    repaired = re.sub(r" {2,}", " ", repaired)
    repaired = re.sub(r"：{2,}", "：", repaired)
    repaired = re.sub(r"\s+([，。；：！？])", r"\1", repaired)
    return repaired.strip()


def normalize_english_interpretation(source: str, modern: str) -> str:
    stripped = source.strip()
    links = MARKDOWN_LINK.findall(stripped)
    without_links = MARKDOWN_LINK.sub("", stripped).replace("[", "").replace("]", "").strip()
    if re.fullmatch(r"(?:If\s+)?Therefore\s+etc\.?", without_links, re.IGNORECASE):
        return "由此命题得证。" + (" " + " ".join(links) if links else "")
    if re.fullmatch(r"Q\.?\s*E\.?\s*D\.?", stripped, re.IGNORECASE):
        return "证毕。"
    if re.fullmatch(r"Q\.?\s*E\.?\s*F\.?", stripped, re.IGNORECASE):
        return "所求作图完成。"
    if "what it was required to do" in stripped.lower():
        return "这正是所要求作的图形；作图完成。"
    if "what it was required to prove" in stripped.lower():
        return "这正是所要求证明的结论；证毕。"
    cleaned = clean_modern(modern)
    cleaned = re.sub(r"\bseparando\b", "分比", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:componendo|comconendo|commonendo|compenendo)\b", "合比", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bLemma\b", "引理", cleaned)
    cleaned = cleaned.replace("角度是正确的", "该角是直角")
    cleaned = cleaned.replace("固态角", "立体角")
    cleaned = cleaned.replace("矩形线", "矩形")
    cleaned = cleaned.replace("正方形线", "正方形")
    cleaned = cleaned.replace("星级", "量")
    cleaned = cleaned.replace("；whole 与 whole 之比等于 a 与 numbe 之比。", "")
    cleaned = cleaned.replace("；one 与 one 之比等于 all 与 all 之比。", "")
    cleaned = cleaned.replace("；AB 与 BE 之比等于 not 与 CD 之比。", "")
    cleaned = re.sub(r"\bFgt\b", "F", cleaned)
    cleaned = re.sub(r"\bQ(?:\s*[.。号])?\s*E(?:\s*[.。号])?\s*D(?:\s*[.。号])?", "证毕。", cleaned)
    cleaned = cleaned.replace("因此,等等。", "由此命题得证。")
    return cleaned


def protect(text: str, replacements: dict[str, str], historical: bool) -> str:
    protected = text

    def replacement(prefix: str, value: str) -> str:
        token = (
            f"{'P' if prefix == 'POINT' else 'R'}{len(replacements):04d}"
            if historical
            else f"ZXQ{prefix}{len(replacements):07d}ZXQ"
        )
        replacements[token] = value
        return token

    protected = MARKDOWN_LINK.sub(lambda match: replacement("LINK", match.group(0)), protected)
    protected = MATH_SPAN.sub(lambda match: replacement("MATH", match.group(0)), protected)
    if historical:
        protected = HISTORICAL_REFERENCE.sub(lambda match: replacement("LINK", match.group(0)), protected)
        protected = ANCIENT_POINT.sub(lambda match: replacement("POINT", match.group(0)), protected)
    return protected


def restore(text: str, replacements: dict[str, str]) -> str:
    restored = text
    restored = re.sub(r"\b([PR])\s+(\d{4})\b", r"\1\2", restored)
    for token, original in replacements.items():
        restored = restored.replace(token, original)
    leftovers = PROTECTED_TOKEN.findall(restored)
    if leftovers:
        raise ValueError(f"Translation left protected tokens: {leftovers[:3]}")
    return restored


def split_literary_paragraph(text: str, maximum_characters: int = 165) -> list[str]:
    pieces = [piece for piece in re.split(r"(?<=[。！？；;〉])", text) if piece]
    result: list[str] = []
    current = ""
    for piece in pieces:
        if len(piece) > maximum_characters:
            if current:
                result.append(current)
                current = ""
            result.extend(piece[index : index + maximum_characters] for index in range(0, len(piece), maximum_characters))
            continue
        if current and len(current) + len(piece) > maximum_characters:
            result.append(current)
            current = ""
        current += piece
    if current:
        result.append(current)
    return result if len(result) > 1 else [text[: len(text) // 2], text[len(text) // 2 :]]


def batches(units: list[Unit], maximum_characters: int) -> list[list[Unit]]:
    result: list[list[Unit]] = []
    batch: list[Unit] = []
    length = 0
    for unit in units:
        added = len(unit.text) + 22
        if batch and length + added > maximum_characters:
            result.append(batch)
            batch = []
            length = 0
        batch.append(unit)
        length += added
    if batch:
        result.append(batch)
    return result


def translate_batch(
    units: list[Unit],
    service: TranslationService,
    cache: DurableCache,
    literary: bool,
    backend: str,
) -> int:
    if not units:
        return 0
    replacements: dict[str, str] = {}
    pieces: list[str] = []
    for index, unit in enumerate(units):
        text = normalize_ancient(unit.text) if literary else unit.text
        pieces.append(f"ZXQSEG{index:06d}ZXQ {protect(text, replacements, literary)}")
    source = "\n".join(pieces)

    try:
        translated = (
            service.bing_translate(source, "lzh" if literary else "en")
            if literary or backend == "bing"
            else service.google(source)
        )
        markers = list(SEGMENT_TOKEN.finditer(translated))
        if len(units) == 1 and not markers:
            # Literary translation occasionally treats an initial synthetic
            # marker as noise.  A one-paragraph request has no boundary to
            # reconstruct, so the translated body remains unambiguous.
            translated = f"ZXQSEG000000ZXQ {translated}"
            markers = list(SEGMENT_TOKEN.finditer(translated))
        if len(markers) != len(units) or any(int(marker.group(1)) != index for index, marker in enumerate(markers)):
            raise ValueError(
                f"Translator changed paragraph boundaries: expected {len(units)}, received {len(markers)}"
            )
        decoded: list[tuple[str, str]] = []
        for index, marker in enumerate(markers):
            end = markers[index + 1].start() if index + 1 < len(markers) else len(translated)
            value = clean_modern(restore(translated[marker.end() : end], replacements))
            if literary:
                value = normalize_historical_interpretation(units[index].text, value)
            if not value:
                raise ValueError(f"Translator returned an empty paragraph at batch segment {index}")
            original_links = Counter(MARKDOWN_LINK.findall(units[index].text))
            resulting_links = Counter(MARKDOWN_LINK.findall(value))
            if original_links != resulting_links:
                raise ValueError("Translation changed one or more internal citation links")
            decoded.append((units[index].key, value))
        for key, value in decoded:
            cache.save(key, value)
        return len(decoded)
    except (RuntimeError, ValueError) as error:
        if len(units) == 1:
            if literary and len(units[0].text) > 120:
                fragments = split_literary_paragraph(units[0].text)
                fragment_units = [
                    Unit(unit_key("lzh-fragment-v1", fragment), fragment, "lzh-fragment-v1")
                    for fragment in fragments
                ]
                pending = [fragment for fragment in fragment_units if fragment.key not in cache.values]
                if pending:
                    translate_batch(pending, service, cache, True, backend)
                combined = "".join(cache.values[fragment.key] for fragment in fragment_units)
                combined = normalize_historical_interpretation(units[0].text, combined)
                cache.save(units[0].key, combined)
                return 1
            raise RuntimeError(f"Unable to translate {units[0].key}: {error}") from error
        midpoint = len(units) // 2
        return translate_batch(units[:midpoint], service, cache, literary, backend) + translate_batch(
            units[midpoint:], service, cache, literary, backend
        )


def run_phase(
    label: str,
    units: list[Unit],
    service: TranslationService,
    cache: DurableCache,
    workers: int,
    maximum_characters: int,
    literary: bool,
    backend: str,
) -> None:
    unique = list({unit.key: unit for unit in units}.values())
    outstanding = [unit for unit in unique if unit.key not in cache.values]
    pending_batches = batches(outstanding, maximum_characters)
    print(
        json.dumps(
            {
                "phase": label,
                "units": len(units),
                "unique": len(unique),
                "cached": len(unique) - len(outstanding),
                "batches": len(pending_batches),
                "workers": workers,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    if not pending_batches:
        return

    completed = 0
    started = time.monotonic()
    worker_local = threading.local()

    def run_batch(batch: list[Unit]) -> int:
        current_service = service
        if literary and workers > 1:
            current_service = getattr(worker_local, "service", None)
            if current_service is None:
                current_service = TranslationService(service.limiter.minimum_interval)
                current_service.limiter = service.limiter
                worker_local.service = current_service
        return translate_batch(batch, current_service, cache, literary, backend)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(run_batch, batch) for batch in pending_batches]
        for future in as_completed(futures):
            completed += future.result()
            elapsed = time.monotonic() - started
            print(
                json.dumps(
                    {
                        "phase": label,
                        "completed": completed,
                        "remaining": len(outstanding) - completed,
                        "percent": round(completed / len(outstanding) * 100, 1),
                        "elapsedSeconds": round(elapsed, 1),
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )


def paragraphs(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]


def apply_editorial_overrides(entries: list[dict[str, Any]], cache: DurableCache) -> int:
    updated = 0
    for entry in entries:
        entry_id = entry["id"]
        statement = EDITORIAL_STATEMENTS.get(entry_id)
        if statement:
            cache.override(unit_key("en-v1", entry["statement"]), statement)
            updated += 1
        for index, translation in EDITORIAL_PROOF.get(entry_id, {}).items():
            source = paragraphs(entry["proof"])[index]
            expected_links = Counter(MARKDOWN_LINK.findall(source))
            actual_links = Counter(MARKDOWN_LINK.findall(translation))
            if expected_links != actual_links:
                raise ValueError(f"Editorial translation changed original links: {entry_id} paragraph {index}")
            cache.override(unit_key("en-v1", source), translation)
            updated += 1
        if entry_id in EDITORIAL_HISTORICAL:
            historical = paragraphs(entry["historicalChineseProof"])
            for index, translation in EDITORIAL_HISTORICAL[entry_id].items():
                cache.override(unit_key("lzh-v1", historical[index]), translation)
                updated += 1
            # The historical heading repeats the genuine first paragraph for
            # these landmark propositions; use the same verified rendering.
            if 0 in EDITORIAL_HISTORICAL[entry_id] and historical[0] == entry["historicalChineseStatement"]:
                cache.override(
                    unit_key("lzh-v1", entry["historicalChineseStatement"]),
                    EDITORIAL_HISTORICAL[entry_id][0],
                )
                updated += 1
        historical_statement = EDITORIAL_HISTORICAL_STATEMENTS.get(entry_id)
        if historical_statement:
            cache.override(unit_key("lzh-v1", entry["historicalChineseStatement"]), historical_statement)
            updated += 1
    return updated


def repair_historical_cache(entries: list[dict[str, Any]], cache: DurableCache) -> int:
    repaired = 0
    processed: set[str] = set()
    for entry in entries:
        if not entry.get("historicalChineseProof"):
            continue
        sources = [entry["historicalChineseStatement"], *paragraphs(entry["historicalChineseProof"])]
        for source in sources:
            key = unit_key("lzh-v1", source)
            if key in processed or key not in cache.values:
                continue
            processed.add(key)
            original = cache.values[key]
            corrected = repair_historical_artifacts(source, original)
            if corrected != original:
                cache.override(key, corrected)
                repaired += 1
    return repaired


def proof_block_ids(entry: dict[str, Any], source_paragraphs: list[str]) -> list[str]:
    result: list[str] = []
    construction = 0
    proof = 0
    for index, paragraph in enumerate(source_paragraphs):
        if index == len(source_paragraphs) - 1 and CONCLUSION_PARAGRAPH.search(paragraph):
            result.append(f"{entry['id']}.conclusion")
        elif CONSTRUCTION_PARAGRAPH.search(paragraph):
            construction += 1
            result.append(f"{entry['id']}.construction.{construction}")
        else:
            proof += 1
            result.append(f"{entry['id']}.proof.{proof}")
    return result


def build_output(entries: list[dict[str, Any]], cache: DurableCache, corpus: dict[str, Any]) -> dict[str, Any]:
    modern_entries: dict[str, Any] = {}
    english_count = 0
    historical_count = 0
    for entry in entries:
        original_proof = paragraphs(entry["proof"])
        translated_proof = [
            normalize_english_interpretation(paragraph, cache.values[unit_key("en-v1", paragraph)])
            for paragraph in original_proof
        ]
        block_ids = proof_block_ids(entry, original_proof)
        historical_proof = paragraphs(entry.get("historicalChineseProof", ""))
        historical_modern = [cache.values[unit_key("lzh-v1", paragraph)] for paragraph in historical_proof]
        statement = (
            "官方 Perseus TEI 保留了本条定义编号，但原始段落为空，现有底本不足以提供真实原文，因此不编造现代译文。"
            if entry.get("sourceMissing")
            else normalize_english_interpretation(entry["statement"], cache.values[unit_key("en-v1", entry["statement"])])
        )
        modern: dict[str, Any] = {
            "statement": statement,
            "proofParagraphs": translated_proof,
            "historicalModernParagraphs": historical_modern,
        }
        if historical_proof:
            modern["historicalModernStatement"] = cache.values[
                unit_key("lzh-v1", entry["historicalChineseStatement"])
            ]
        # Proof arrays are the compact canonical representation.  The UI can
        # match proofByBlockId when an individual block needs direct lookup.
        if original_proof:
            modern["proofByBlockId"] = dict(zip(block_ids, translated_proof, strict=True))
        if historical_proof:
            modern["historicalByBlockId"] = {
                f"{entry['id']}.historical.{index + 1}": value
                for index, value in enumerate(historical_modern)
            }
        modern_entries[entry["id"]] = modern
        english_count += len(translated_proof)
        historical_count += len(historical_modern)

    return {
        "source": {
            "language": "zh-CN",
            "status": "complete",
            "englishSource": "Thomas Little Heath, The Thirteen Books of Euclid's Elements (1908)",
            "englishSourceLicense": "CC BY-SA 4.0",
            "englishSourceSha256": corpus["source"]["sha256"],
            "modernTranslation": (
                "Modern Chinese machine-assisted translation of the attributed Heath English text "
                "with the Apache-2.0 Helsinki-NLP/opus-mt-en-zh model; a small number of "
                "independently cached paragraphs use Microsoft Translator or hand-reviewed renderings."
            ),
            "modernTranslationModel": "Helsinki-NLP/opus-mt-en-zh",
            "modernTranslationModelLicense": "Apache-2.0",
            "historicalInterpretation": (
                "Modern Chinese machine-assisted interpretation translated directly from the matched "
                "Xu Guangqi / Matteo Ricci historical Chinese paragraphs with protected mathematical notation."
            ),
            "historicalTranslator": "Microsoft Translator Literary Chinese (lzh → zh-Hans)",
            "historicalTranslatorDocumentation": (
                "https://www.microsoft.com/en-us/translator/blog/2021/08/25/"
                "microsoft-translator-releases-literary-chinese-translation/"
            ),
            "entries": len(entries),
            "proofParagraphs": english_count,
            "historicalParagraphs": historical_count,
        },
        "entries": modern_entries,
    }


def is_complete(entry: dict[str, Any], cache: DurableCache) -> bool:
    expected: list[str] = []
    if not entry.get("sourceMissing"):
        expected.append(unit_key("en-v1", entry["statement"]))
    expected.extend(unit_key("en-v1", item) for item in paragraphs(entry["proof"]))
    if entry.get("historicalChineseProof"):
        expected.append(unit_key("lzh-v1", entry["historicalChineseStatement"]))
        expected.extend(unit_key("lzh-v1", item) for item in paragraphs(entry["historicalChineseProof"]))
    return all(key in cache.values for key in expected)


def write_output(entries: list[dict[str, Any]], cache: DurableCache, corpus: dict[str, Any], status: str) -> None:
    output = build_output(entries, cache, corpus)
    output["source"]["status"] = status
    temporary = OUTPUT_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT_PATH)
    print(
        json.dumps(
            {
                "status": status,
                "output": str(OUTPUT_PATH),
                "entries": len(output["entries"]),
                "proofParagraphs": output["source"]["proofParagraphs"],
                "historicalParagraphs": output["source"]["historicalParagraphs"],
                "bytes": OUTPUT_PATH.stat().st_size,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=Path(tempfile.gettempdir()) / "mathforge-euclid-translation-cache")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--interval", type=float, default=0.33)
    parser.add_argument("--english-batch-chars", type=int, default=3900)
    parser.add_argument("--historical-batch-chars", type=int, default=2300)
    parser.add_argument("--historical-workers", type=int, default=1)
    parser.add_argument("--backend", choices=("bing", "google"), default="bing")
    parser.add_argument("--mode", choices=("all", "historical-only", "assemble"), default="all")
    parser.add_argument("--external-cache", type=Path, action="append", default=[])
    parser.add_argument(
        "--refresh-external-cache",
        action="store_true",
        help="Replace stale cached provider translations with a newly audited external cache; editorial overrides still win.",
    )
    args = parser.parse_args()

    corpus = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    entries = corpus["entries"]
    cache = DurableCache(args.cache_dir / "translations.jsonl")
    print(json.dumps({"editorialOverrides": apply_editorial_overrides(entries, cache)}), flush=True)
    for external in args.external_cache:
        print(
            json.dumps(
                {
                    "importedExternalCache": str(external),
                    "records": cache.import_file(external, refresh_existing=args.refresh_external_cache),
                }
            ),
            flush=True,
        )
    service = TranslationService(args.interval)

    english: list[Unit] = []
    historical: list[Unit] = []
    for entry in entries:
        if not entry.get("sourceMissing"):
            english.append(Unit(unit_key("en-v1", entry["statement"]), entry["statement"], "en-v1"))
        english.extend(Unit(unit_key("en-v1", item), item, "en-v1") for item in paragraphs(entry["proof"]))
        if entry.get("historicalChineseProof"):
            historical.append(
                Unit(unit_key("lzh-v1", entry["historicalChineseStatement"]), entry["historicalChineseStatement"], "lzh-v1")
            )
            historical.extend(
                Unit(unit_key("lzh-v1", item), item, "lzh-v1")
                for item in paragraphs(entry["historicalChineseProof"])
            )

    bootstrap_ids = {
        "euclid-1-def-1",
        "euclid-1-def-15",
        "euclid-1-post-5",
        "euclid-1-cn-1",
        "euclid-1-1",
        "euclid-1-21",
        "euclid-1-27",
        "euclid-1-47",
    }
    bootstrap_entries = [entry for entry in entries if entry["id"] in bootstrap_ids]
    bootstrap_english: list[Unit] = []
    bootstrap_historical: list[Unit] = []
    for entry in bootstrap_entries:
        if not entry.get("sourceMissing"):
            bootstrap_english.append(Unit(unit_key("en-v1", entry["statement"]), entry["statement"], "en-v1"))
        bootstrap_english.extend(Unit(unit_key("en-v1", item), item, "en-v1") for item in paragraphs(entry["proof"]))
        if entry.get("historicalChineseProof"):
            bootstrap_historical.append(
                Unit(unit_key("lzh-v1", entry["historicalChineseStatement"]), entry["historicalChineseStatement"], "lzh-v1")
            )
            bootstrap_historical.extend(
                Unit(unit_key("lzh-v1", item), item, "lzh-v1")
                for item in paragraphs(entry["historicalChineseProof"])
            )

    if args.mode != "assemble":
        if args.mode == "all":
            run_phase(
                "bootstrap-english", bootstrap_english, service, cache, 1, args.english_batch_chars, False, args.backend
            )
        run_phase(
            "bootstrap-literary", bootstrap_historical, service, cache, 1, args.historical_batch_chars, True, args.backend
        )
        available_bootstrap = [entry for entry in bootstrap_entries if is_complete(entry, cache)]
        if available_bootstrap:
            write_output(available_bootstrap, cache, corpus, "partial")

        if args.mode == "all":
            english_workers = args.workers if args.backend == "google" else 1
            run_phase(
                "english-to-modern", english, service, cache, english_workers, args.english_batch_chars, False, args.backend
            )
        # One shared Microsoft web session must be used serially; parallel POSTs
        # can invalidate anti-abuse tokens and trigger HTTP 401.
        run_phase(
            "literary-to-modern",
            historical,
            service,
            cache,
            args.historical_workers,
            args.historical_batch_chars,
            True,
            args.backend,
        )

    for external in args.external_cache:
        print(
            json.dumps(
                {
                    "importedExternalCache": str(external),
                    "records": cache.import_file(external, refresh_existing=args.refresh_external_cache),
                }
            ),
            flush=True,
        )

    print(json.dumps({"repairedHistoricalArtifacts": repair_historical_cache(entries, cache)}), flush=True)
    # Manually reviewed landmark propositions always take precedence over an
    # imported model cache or a generic historical artifact cleanup.
    apply_editorial_overrides(entries, cache)

    completed = [entry for entry in entries if is_complete(entry, cache)]
    if len(completed) == len(entries):
        write_output(entries, cache, corpus, "complete")
    elif args.mode == "assemble":
        missing = [entry["id"] for entry in entries if not is_complete(entry, cache)]
        raise RuntimeError(f"Cannot assemble incomplete translation: {len(missing)} missing entries; first={missing[:8]}")
    elif completed:
        write_output(completed, cache, corpus, "partial")
    else:
        print(json.dumps({"status": "awaiting-external-english-cache"}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
