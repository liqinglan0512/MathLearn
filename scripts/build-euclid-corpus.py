#!/usr/bin/env python3
"""Build MathForge's attributable, citation-linked Euclid corpus.

The canonical source is Perseus Digital Library's 1908 Thomas Heath
translation, distributed under CC BY-SA 4.0.  Public-domain historical
Chinese passages are attached only to books whose complete proposition
numbering matches the canonical edition (I-IV and VI).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


NAMESPACE = {"tei": "http://www.tei-c.org/ns/1.0"}
SOURCE_URL = (
    "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/"
    "data/tlg1799/tlg001/tlg1799.tlg001.perseus-eng2.xml"
)
SOURCE_PAGE = (
    "https://github.com/PerseusDL/canonical-greekLit/blob/master/"
    "data/tlg1799/tlg001/tlg1799.tlg001.perseus-eng2.xml"
)
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
CHINESE_SOURCE_PAGE = "https://zh.wikisource.org/zh-hans/幾何原本"
EXPECTED_PROPOSITIONS = (48, 14, 37, 16, 25, 33, 39, 27, 36, 115, 39, 18, 18)
EXPECTED_DEFINITIONS = (23, 2, 11, 7, 18, 5, 22, 0, 0, 16, 28, 0, 0)
ROMAN = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII")
BOOK_TITLES = (
    "平面几何基础：三角形、平行线与面积",
    "几何代数：线段、矩形与平方",
    "圆的几何：弦、切线与圆周角",
    "内接与外切：正多边形的尺规作图",
    "比例论：量与量之间的关系",
    "相似与比例：图形的尺度结构",
    "初等数论：整除、互素与最大公约数",
    "连比例数列：平方数与立方数",
    "素数与数列：无穷性和完全数",
    "不可公度量：无理线段的精细分类",
    "立体几何基础：直线、平面与平行六面体",
    "穷竭法：圆、圆锥、圆柱与球的测量",
    "正多面体：黄金分割与五种柏拉图立体",
)

# These titles are editorial summaries, not claims of being historical
# translations.  Every underlying statement and proof comes from the TEI.
CURATED_TITLES: dict[tuple[int, int], str] = {
    (1, 1): "等边三角形的尺规作图",
    (1, 2): "把给定线段平移到指定点",
    (1, 3): "从长线段截取与短线段相等的部分",
    (1, 4): "三角形全等：两边及其夹角相等",
    (1, 5): "等腰三角形：等边对等角",
    (1, 6): "等腰三角形逆定理：等角对等边",
    (1, 7): "三角形的两边不能在同侧形成两个顶点",
    (1, 8): "三角形全等：三边分别相等",
    (1, 9): "角平分线的尺规作图",
    (1, 10): "线段中点的尺规作图",
    (1, 11): "过线上一点作直线的垂线",
    (1, 12): "从线外一点向直线作垂线",
    (1, 13): "邻补角：直线上形成的两角和为平角",
    (1, 14): "邻补角逆定理：两角和为平角则共线",
    (1, 15): "对顶角相等",
    (1, 16): "三角形外角大于任一不相邻内角",
    (1, 17): "三角形任意两内角之和小于平角",
    (1, 18): "三角形中大边对大角",
    (1, 19): "三角形中大角对大边",
    (1, 20): "三角不等式：两边之和大于第三边",
    (1, 21): "三角形内部折线的长度与夹角",
    (1, 22): "用满足三角不等式的三条线段构造三角形",
    (1, 23): "在给定点复制一个角",
    (1, 24): "铰链定理：夹角越大，对边越长",
    (1, 25): "铰链定理逆命题：对边越长，夹角越大",
    (1, 26): "三角形全等：两角和对应边相等",
    (1, 27): "平行线判定：内错角相等，两直线平行",
    (1, 28): "平行线判定：同位角相等或同旁内角互补",
    (1, 29): "平行线性质：内错角、同位角与同旁内角",
    (1, 30): "平行关系的传递性",
    (1, 31): "过已知点作已知直线的平行线",
    (1, 32): "三角形内角和与外角定理",
    (1, 33): "连接两条相等平行线段所得线段仍相等平行",
    (1, 34): "平行四边形的对边、对角与对角线",
    (1, 35): "同底同高平行四边形面积相等",
    (1, 36): "等底同高平行四边形面积相等",
    (1, 37): "同底同高三角形面积相等",
    (1, 38): "等底同高三角形面积相等",
    (1, 39): "等面积同底三角形位于同一组平行线之间",
    (1, 40): "等面积等底三角形位于同一组平行线之间",
    (1, 41): "同底同高时平行四边形面积是三角形的两倍",
    (1, 42): "构造与给定三角形等面积的平行四边形",
    (1, 43): "平行四边形对角线两侧的余形面积相等",
    (1, 44): "在给定线段上构造与三角形等面积的平行四边形",
    (1, 45): "把任意直线图形化为等面积平行四边形",
    (1, 46): "以给定线段为边作正方形",
    (1, 47): "勾股定理：直角三角形斜边平方等于两直角边平方和",
    (1, 48): "勾股定理的逆命题",
    (2, 1): "乘法分配律的几何表达",
    (2, 2): "线段整体与分段矩形面积",
    (2, 3): "线段分割与矩形面积分解",
    (2, 4): "完全平方公式的几何证明",
    (2, 5): "平方差恒等式的几何证明",
    (2, 6): "延长线段上的平方与矩形关系",
    (2, 7): "线段平方与矩形面积恒等式",
    (2, 8): "四倍矩形与平方恒等式",
    (2, 9): "两分点与线段平方和",
    (2, 10): "中点、延长段与平方和",
    (2, 11): "黄金分割的几何构造",
    (2, 12): "钝角三角形的余弦定理雏形",
    (2, 13): "锐角三角形的余弦定理雏形",
    (2, 14): "构造与任意多边形等面积的正方形",
    (3, 1): "寻找给定圆的圆心",
    (3, 3): "垂径定理与逆定理",
    (3, 10): "两个圆至多相交于两点",
    (3, 11): "内切两圆的圆心与切点共线",
    (3, 12): "外切两圆的圆心与切点共线",
    (3, 14): "圆中等弦到圆心的距离相等，反之亦然",
    (3, 16): "圆的切线垂直于切点处的半径",
    (3, 17): "过圆外一点作圆的切线",
    (3, 20): "圆心角等于同弧圆周角的两倍",
    (3, 21): "同弧所对圆周角相等",
    (3, 22): "圆内接四边形的对角互补",
    (3, 31): "半圆所对的圆周角是直角",
    (3, 32): "弦切角定理",
    (3, 35): "相交弦定理",
    (3, 36): "切割线定理",
    (3, 37): "切割线定理的逆命题",
    (4, 2): "在圆内作与给定三角形相似的三角形",
    (4, 3): "在圆外作与给定三角形相似的外切三角形",
    (4, 4): "三角形内切圆的尺规作图",
    (4, 5): "三角形外接圆的尺规作图",
    (4, 6): "在给定圆内作内接正方形",
    (4, 7): "在给定圆外作外切正方形",
    (4, 8): "为给定正方形作内切圆",
    (4, 9): "为给定正方形作外接圆",
    (4, 10): "黄金三角形的尺规构造",
    (4, 11): "圆内接正五边形的尺规作图",
    (4, 15): "圆内接正六边形的尺规作图",
    (4, 16): "圆内接正十五边形的尺规作图",
    (5, 7): "相等的量与同一量形成相同的比",
    (5, 8): "不等量对应的比例大小关系",
    (5, 11): "比例相等的传递性",
    (5, 16): "比例的交错变换",
    (5, 18): "分比与合比的转换",
    (6, 1): "同高三角形与平行四边形的面积比等于底边比",
    (6, 2): "平行截线定理及其逆命题",
    (6, 3): "角平分线定理及其逆命题",
    (6, 4): "相似三角形对应边成比例",
    (6, 5): "三边成比例的三角形相似",
    (6, 6): "两边成比例且夹角相等的三角形相似",
    (6, 8): "直角三角形高线分出的两个三角形相似",
    (6, 13): "作两条线段的比例中项",
    (6, 19): "相似三角形面积比等于对应边比的平方",
    (6, 30): "把线段分成黄金比例",
    (6, 31): "勾股定理推广到相似图形",
    (7, 1): "互素判定与辗转相减法",
    (7, 2): "欧几里得算法：求两个整数的最大公约数",
    (7, 3): "求三个整数的最大公约数",
    (7, 21): "互素整数给出既约比",
    (7, 30): "欧几里得引理：素数整除乘积必整除一个因子",
    (7, 31): "合数一定有素因子",
    (7, 32): "每个整数要么是素数，要么有素因子",
    (7, 34): "求两个整数的最小公倍数",
    (8, 1): "连续比例数列与互素首末项",
    (8, 14): "平方数整除与底数整除",
    (8, 25): "立方数的比例结构",
    (9, 8): "等比数列中的平方数与立方数",
    (9, 20): "素数有无穷多个",
    (9, 21): "偶数之和仍为偶数",
    (9, 36): "欧几里得完全数构造",
    (10, 1): "穷竭法引理：反复减半终将小于任意给定量",
    (10, 2): "辗转相减不停机与不可公度",
    (10, 3): "求两个可公度量的最大公度",
    (10, 4): "求三个可公度量的最大公度",
    (10, 9): "长度可公度与平方数比例",
    (10, 10): "构造长度或平方不可公度的线段",
    (10, 11): "比例关系保持可公度与不可公度",
    (10, 115): "由中项线段生成无穷多类无理线段",
    (11, 1): "直线不能一部分在平面内而另一部分离开平面",
    (11, 2): "两条相交直线确定一个平面",
    (11, 3): "两个相交平面的交线是一条直线",
    (11, 4): "同时垂直两条相交直线则垂直其所在平面",
    (11, 6): "垂直同一平面的两条直线互相平行",
    (11, 11): "从平面外一点向平面作垂线",
    (11, 12): "从平面上一点向平面作垂线",
    (11, 14): "垂直同一直线的两个平面互相平行",
    (11, 21): "任何立体角的平面角之和小于四个直角",
    (12, 1): "圆内接相似多边形面积比等于直径平方比",
    (12, 2): "圆面积之比等于直径平方之比",
    (12, 7): "三棱柱可以分成三个等体积棱锥",
    (12, 10): "圆锥体积是同底同高圆柱的三分之一",
    (12, 18): "球体积之比等于直径立方之比",
    (13, 1): "黄金分割与线段平方关系",
    (13, 8): "正五边形对角线中的黄金分割",
    (13, 12): "圆内接等边三角形边长平方是半径平方的三倍",
    (13, 13): "作内接于球的正四面体",
    (13, 14): "作内接于球的正八面体",
    (13, 15): "作内接于球的正六面体",
    (13, 16): "作内接于球的正二十面体",
    (13, 17): "作内接于球的正十二面体",
    (13, 18): "比较五种正多面体的边长",
}

FOUNDATION_TITLES: dict[tuple[str, int], str] = {
    ("definition", 1): "点：没有部分的对象",
    ("definition", 2): "线：只有长度而没有宽度",
    ("definition", 3): "线的两端是点",
    ("definition", 4): "直线：在线上各点之间均匀延伸",
    ("definition", 5): "面：只有长度和宽度",
    ("definition", 6): "面的边界是线",
    ("definition", 7): "平面：在其上的直线之间均匀展开",
    ("definition", 8): "平面角：相交两线之间的倾斜",
    ("definition", 9): "直线角：由两条直线组成的角",
    ("definition", 10): "直角与垂直线",
    ("definition", 11): "钝角：大于直角的角",
    ("definition", 12): "锐角：小于直角的角",
    ("definition", 13): "边界：对象的端点",
    ("definition", 14): "图形：由边界围成的对象",
    ("definition", 15): "圆：到圆心距离相等的点形成的图形",
    ("definition", 16): "圆心",
    ("definition", 17): "直径：经过圆心的线段",
    ("definition", 18): "半圆：由直径和半个圆周围成",
    ("definition", 19): "直线图形：三边形、四边形和多边形",
    ("definition", 20): "三角形按边长分类",
    ("definition", 21): "三角形按角分类",
    ("definition", 22): "四边形按边与角分类",
    ("definition", 23): "平行线：同一平面内永不相交的直线",
    ("postulate", 1): "公设一：任意两点之间可以连成直线",
    ("postulate", 2): "公设二：有限直线可以无限延长",
    ("postulate", 3): "公设三：给定圆心和半径可以作圆",
    ("postulate", 4): "公设四：所有直角彼此相等",
    ("postulate", 5): "公设五：平行公设",
    ("common-notion", 1): "公理一：等于同一事物的事物彼此相等",
    ("common-notion", 2): "公理二：等量加等量，所得总量相等",
    ("common-notion", 3): "公理三：等量减等量，所得余量相等",
    ("common-notion", 4): "公理四：彼此重合的事物相等",
    ("common-notion", 5): "公理五：整体大于部分",
}

# Book I's definitions are handled above together with its postulates and
# common notions.  The other definitions are summarized separately so that
# distinct concepts do not collapse into repeated labels such as “比例” or
# “整数”.  These are transparent editorial headings, not substitute source
# text; the corresponding unabridged Heath definitions remain attached.
DEFINITION_TITLES: dict[tuple[int, int], str] = {
    (2, 1): "直角所夹两线构成的矩形",
    (2, 2): "矩形与余形构成的曲尺形",
    (3, 1): "等圆：直径或半径相等的圆",
    (3, 2): "圆的切线：接触圆而不穿过圆的直线",
    (3, 3): "相切的圆：彼此接触而不相割",
    (3, 4): "等距弦：到圆心的垂线长度相等",
    (3, 5): "弦离圆心的远近由垂线长度决定",
    (3, 6): "弓形：由一条弦与圆弧围成",
    (3, 7): "弓形角：由弦与圆弧围成的角",
    (3, 8): "弓形内的圆周角",
    (3, 9): "圆周角所对应的圆弧",
    (3, 10): "扇形：由两条半径与圆弧围成",
    (3, 11): "相似弓形：所容纳的圆周角相等",
    (4, 1): "直线图形内接于另一直线图形",
    (4, 2): "直线图形外切于另一直线图形",
    (4, 3): "圆内接多边形",
    (4, 4): "圆外切多边形",
    (4, 5): "直线图形的内切圆",
    (4, 6): "直线图形的外接圆",
    (4, 7): "圆的弦：两端都落在圆周上的线段",
    (5, 1): "量的部分：较小量能够整度量较大量",
    (5, 2): "量的倍数",
    (5, 3): "比：同类量之间的大小关系",
    (5, 4): "可成比的量：倍增之后能够彼此超过",
    (5, 5): "欧多克索斯比例定义：任意等倍数的比较",
    (5, 6): "成比例的量",
    (5, 7): "比较两个比的大小",
    (5, 8): "三项比例",
    (5, 9): "重比：三项连比例中的平方比",
    (5, 10): "三重比：四项连比例中的立方比",
    (5, 11): "比例的对应前项与对应后项",
    (5, 12): "交错比",
    (5, 13): "反比",
    (5, 14): "合比",
    (5, 15): "分比",
    (5, 16): "转比",
    (5, 17): "等列比：消去中项后的两端比例",
    (5, 18): "交错次序的比例",
    (6, 1): "相似直线图形：对应角相等且对应边成比例",
    (6, 2): "互逆关联的图形",
    (6, 3): "黄金分割：全段与大段之比等于大段与小段之比",
    (6, 4): "图形的高：从顶点到底边的垂线",
    (7, 1): "单位：使每个对象被称为一的事物",
    (7, 2): "整数：由若干单位组成的数量",
    (7, 3): "整数的整除部分",
    (7, 4): "不能整除时的若干部分",
    (7, 5): "整数的倍数",
    (7, 6): "偶数：能够分成两个相等部分的整数",
    (7, 7): "奇数：不能分成两个相等部分的整数",
    (7, 8): "偶乘偶数",
    (7, 9): "偶乘奇数",
    (7, 10): "奇乘奇数",
    (7, 11): "素数：只能由单位整除",
    (7, 12): "互素整数：公约数只有单位",
    (7, 13): "合数：可以被某个整数整除",
    (7, 14): "具有共同因子的整数",
    (7, 15): "整数乘法：重复相加",
    (7, 16): "平面数：两个整数的乘积",
    (7, 17): "立体数：三个整数的乘积",
    (7, 18): "平方数",
    (7, 19): "立方数",
    (7, 20): "成比例的整数",
    (7, 21): "相似平面数与相似立体数",
    (7, 22): "完全数：等于自身真因子之和",
    (10, 1): "可公度量与不可公度量",
    (10, 2): "平方可公度与平方不可公度",
    (10, 3): "有理线段与无理线段的约定",
    (10, 4): "有理面积、无理面积及其对应线段",
    (10, 5): "第一类二项无理线段",
    (10, 6): "第二类二项无理线段",
    (10, 7): "第三类二项无理线段",
    (10, 8): "第四类二项无理线段",
    (10, 9): "第五类二项无理线段",
    (10, 10): "第六类二项无理线段",
    (10, 11): "第一类截差无理线段",
    (10, 12): "第二类截差无理线段",
    (10, 13): "第三类截差无理线段",
    (10, 14): "第四类截差无理线段",
    (10, 15): "第五类截差无理线段",
    (10, 16): "第六类截差无理线段",
    (11, 1): "立体：具有长度、宽度和深度",
    (11, 2): "立体的边界是曲面或平面",
    (11, 3): "直线垂直于平面",
    (11, 4): "平面垂直于平面",
    (11, 5): "直线与平面所成的角",
    (11, 6): "两个平面之间的二面角",
    (11, 7): "倾角相等的平面",
    (11, 8): "平行平面：永不相交的平面",
    (11, 9): "相似立体：对应面相似且数量相等",
    (11, 10): "全等立体：对应面相似且面积相等",
    (11, 11): "立体角：由多个平面角围成",
    (11, 12): "棱锥：从一个底面汇聚于一个顶点",
    (11, 13): "棱柱：两个底面平行相等且侧面为平行四边形",
    (11, 14): "球：半圆绕其直径旋转形成",
    (11, 15): "球的旋转轴",
    (11, 16): "球心",
    (11, 17): "球的直径",
    (11, 18): "圆锥：直角三角形绕一条直角边旋转形成",
    (11, 19): "圆锥的旋转轴",
    (11, 20): "圆锥的圆形底面",
    (11, 21): "圆柱：矩形绕一条边旋转形成",
    (11, 22): "圆柱的旋转轴",
    (11, 23): "圆柱的两个圆形底面",
    (11, 24): "相似圆锥与相似圆柱",
    (11, 25): "正六面体：由六个相等的正方形围成",
    (11, 26): "正八面体：由八个相等的正三角形围成",
    (11, 27): "正二十面体：由二十个相等的正三角形围成",
    (11, 28): "正十二面体：由十二个相等的正五边形围成",
}

CONCEPTS: tuple[tuple[str, str], ...] = (
    (r"extreme and mean ratio", "黄金分割"),
    (r"alternate angles", "内错角"),
    (r"right[- ]angled triangles?", "直角三角形"),
    (r"equilateral and equiangular pentagon", "正五边形"),
    (r"equilateral and equiangular", "正多边形"),
    (r"greatest common (?:measure|divisor)", "最大公约数"),
    (r"least (?:common multiple|number)", "最小公倍数"),
    (r"prime numbers?|prime to one another", "素数与互素"),
    (r"perfect number", "完全数"),
    (r"continued proportion", "连比例"),
    (r"incommensurable", "不可公度量"),
    (r"commensurable", "可公度量"),
    (r"apotome", "截差无理线段"),
    (r"binomial", "二项无理线段"),
    (r"medial", "中项无理线段"),
    (r"irrational", "无理线段"),
    (r"dodecahedron", "正十二面体"),
    (r"icosahedron", "正二十面体"),
    (r"octahedron", "正八面体"),
    (r"parallelepiped", "平行六面体"),
    (r"pyramid", "棱锥"),
    (r"prism", "棱柱"),
    (r"cylinders?", "圆柱"),
    (r"cones?", "圆锥"),
    (r"spheres?", "球"),
    (r"planes?", "平面"),
    (r"pentagon", "五边形"),
    (r"hexagon", "六边形"),
    (r"decagon", "十边形"),
    (r"polygons?", "多边形"),
    (r"diameters?", "直径"),
    (r"tangents?|touch(?:es|ing)?", "切线"),
    (r"circumference", "圆周"),
    (r"circles?", "圆"),
    (r"parallelograms?", "平行四边形"),
    (r"parallels?|parallel", "平行线"),
    (r"triangles?", "三角形"),
    (r"squares?", "平方"),
    (r"cubes?|cube number", "立方"),
    (r"proportion(?:al|ally)?|ratio", "比例"),
    (r"angles?", "角"),
    (r"straight lines?|segments?", "线段"),
    (r"numbers?", "整数"),
)

CHINESE_DIGITS = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
HISTORICAL_BOOKS = {1: "一", 2: "二", 3: "三", 4: "四", 6: "六"}
HISTORICAL_HEADING = re.compile(
    r"^[=\s\u3000]*第([一二三四五六七八九十百廿卄卅卌]+)题[^\n]*$", re.MULTILINE
)
REFERENCE_TARGET = re.compile(r"elem\.(\d+)\.(?:(c\.n|post|def(?:\.[23])?)\.)?(\d+)")


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "MathForge/1.0 (educational Euclid corpus; source attribution retained)"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def chinese_number(value: str) -> int:
    normalized = value.replace("廿", "二十").replace("卄", "二十").replace("卅", "三十").replace("卌", "四十")
    if "百" in normalized:
        left, _, right = normalized.partition("百")
        return (CHINESE_DIGITS.get(left, 1) * 100) + (chinese_number(right) if right else 0)
    if "十" in normalized:
        left, _, right = normalized.partition("十")
        return (CHINESE_DIGITS.get(left, 1) * 10) + (CHINESE_DIGITS.get(right, 0) if right else 0)
    return CHINESE_DIGITS[normalized]


def fetch_historical_book(book: int, cache_dir: Path) -> dict[int, dict[str, str]]:
    cache_path = cache_dir / f"wikisource-book-{book}.json"
    if cache_path.exists():
        response = json.loads(cache_path.read_text(encoding="utf-8"))
    else:
        title = f"幾何原本/卷{HISTORICAL_BOOKS[book]}"
        query = urllib.parse.urlencode(
            {
                "action": "query",
                "format": "json",
                "formatversion": "2",
                "prop": "extracts",
                "explaintext": "1",
                "redirects": "1",
                "converttitles": "1",
                "variant": "zh-hans",
                "titles": title,
            }
        )
        response = json.loads(fetch_bytes(f"https://zh.wikisource.org/w/api.php?{query}"))
        cache_path.write_text(json.dumps(response, ensure_ascii=False), encoding="utf-8")

    page = response["query"]["pages"][0]
    text = page.get("extract", "")
    if not text:
        raise ValueError(f"Historical Chinese book {book} has no available text")

    matches = list(HISTORICAL_HEADING.finditer(text))
    expected = EXPECTED_PROPOSITIONS[book - 1]
    if len(matches) != expected:
        raise ValueError(
            f"Historical book {book} has {len(matches)} proposition headings; "
            f"canonical Heath edition has {expected}. Refusing ordinal alignment."
        )

    source_url = f"https://zh.wikisource.org/zh-hans/幾何原本/卷{HISTORICAL_BOOKS[book]}"
    result: dict[int, dict[str, str]] = {}
    for index, match in enumerate(matches):
        number = chinese_number(match.group(1))
        if number != index + 1:
            raise ValueError(f"Historical book {book} proposition numbering gap at {number}")
        stop = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        passage = text[match.end() : stop].strip()
        # Later wiki appendices can follow the last proposition.
        passage = re.split(r"\n={2,}\s*(?:注释|参考|原文|维基)", passage, maxsplit=1)[0].strip()
        blocks = [re.sub(r"[\s\u3000]+", "", item) for item in re.split(r"\n\s*\n", passage)]
        blocks = [item for item in blocks if item and not re.match(r"^=+.*=+$", item)]
        if not blocks:
            raise ValueError(f"Historical book {book}.{number} has no proposition passage")
        # Historical editions sometimes omit punctuation after 解曰 / 论曰 /
        # 法曰.  Treat all three as proof/construction boundaries; otherwise
        # an entire ancient proof becomes the proposition heading and list
        # summary (notably III.14 and IV.9).
        statement = re.split(
            r"(?:先|后)?(?:解(?:[^曰。；：:]{0,16})?|论|法)曰[：:]?",
            blocks[0],
            maxsplit=1,
        )[0].strip()
        if not statement:
            # VI.1 in the public-domain source begins directly with “解曰”;
            # its authentic proposition statement survives later as “题言”.
            embedded_statement = re.search(r"题言([^。；]{4,140})", blocks[0])
            if embedded_statement:
                statement = embedded_statement.group(1).strip()
        if not statement:
            raise ValueError(f"Historical book {book}.{number} lacks a verifiable proposition statement")
        result[number] = {
            "statement": statement[:140],
            "proof": "\n\n".join(blocks),
            "sourceUrl": source_url,
        }
    return result


def reference_to_id(target: str) -> list[dict[str, Any]]:
    references: list[dict[str, Any]] = []
    for match in REFERENCE_TARGET.finditer(target):
        book = int(match.group(1))
        marker = match.group(2)
        number = int(match.group(3))
        if marker == "post":
            entry_id = f"euclid-{book}-post-{number}"
            kind = "postulate"
        elif marker == "c.n":
            entry_id = f"euclid-{book}-cn-{number}"
            kind = "common-notion"
        elif marker and marker.startswith("def"):
            group = marker.split(".")[-1]
            offset = 4 if book == 10 and group == "2" else 10 if book == 10 and group == "3" else 0
            number += offset
            entry_id = f"euclid-{book}-def-{number}"
            kind = "definition"
        else:
            entry_id = f"euclid-{book}-{number}"
            kind = "proposition"
        references.append({"id": entry_id, "book": book, "proposition": number, "kind": kind})
    return references


def render_xml(node: ET.Element, dependencies: dict[str, dict[str, Any]]) -> str:
    tag = node.tag.rsplit("}", 1)[-1]
    if tag in {"note", "figure", "pb"}:
        return ""
    if tag == "lb":
        return " "
    if tag == "label":
        return ""

    if tag == "ref":
        label = " ".join("".join(node.itertext()).split())
        references = reference_to_id(node.get("target", ""))
        if references:
            for reference in references:
                dependencies.setdefault(reference["id"], {**reference, "label": label})
            # One source span sometimes cites multiple propositions. Preserve
            # the first visible source label and expose all graph edges.
            return f"[{label}](/principles/{references[0]['id']})"
        return label

    pieces = [node.text or ""]
    for child in node:
        pieces.append(render_xml(child, dependencies))
        pieces.append(child.tail or "")
    return "".join(pieces)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def choose_geometry(book: int, statement: str, kind: str, number: int) -> str:
    text = statement.lower()
    if book in {7, 8, 9}:
        return "number"
    if book == 10:
        return "irrational"
    if book == 5:
        return "ratio"
    if book >= 11:
        if book == 12 and number in {1, 2, 16}:
            return "circle"
        if book == 13 and number <= 12:
            return "polygon" if "pentagon" in text or "hexagon" in text else "ratio"
        return "solid"
    if "parallel" in text and (book == 1 and number in range(27, 34) or kind != "proposition"):
        return "parallel"
    if any(term in text for term in ("circle", "circumference", "tangent", "diameter", "semicircle")):
        return "circle" if book != 4 else "polygon"
    if "parallelogram" in text or "rectangle" in text or "area" in text or book == 2:
        return "area"
    if book == 6 and ("proportion" in text or "ratio" in text):
        return "ratio"
    if "polygon" in text or "pentagon" in text or book == 4:
        return "polygon"
    if "parallel" in text:
        return "parallel"
    return "triangle"


def concept_title(book: int, statement: str, kind: str, number: int, historical: dict[str, str] | None) -> str:
    if book == 1 and (kind, number) in FOUNDATION_TITLES:
        return FOUNDATION_TITLES[(kind, number)]
    if kind == "definition" and (book, number) in DEFINITION_TITLES:
        return DEFINITION_TITLES[(book, number)]
    if kind == "proposition" and (book, number) in CURATED_TITLES:
        return CURATED_TITLES[(book, number)]

    if historical and historical.get("statement"):
        statement_zh = historical["statement"]
        for old, new in (("圜", "圆"), ("形之", "形的"), ("并之", "相加")):
            statement_zh = statement_zh.replace(old, new)
        if len(statement_zh) > 38:
            statement_zh = statement_zh[:37] + "…"
        return statement_zh

    matched: list[str] = []
    lower = statement.lower()
    for pattern, label in CONCEPTS:
        if re.search(pattern, lower) and label not in matched:
            matched.append(label)
        if len(matched) == 3:
            break

    if not matched:
        matched = [BOOK_TITLES[book - 1].split("：", 1)[0]]

    label = "与".join(matched)
    if kind == "definition":
        return f"概念定义：{label}"
    if kind == "postulate":
        return f"基本公设：{label}"
    if kind == "common-notion":
        return f"共同概念：{label}"
    if lower.startswith(("to ", "on a given", "given ")):
        return f"构造与求解：{label}"
    if "equal" in lower or "same ratio" in lower:
        return f"等量关系：{label}"
    if "greater" in lower or "less" in lower:
        return f"大小比较：{label}"
    return f"性质与证明：{label}"


def build_entries(source: ET.Element, historical_books: dict[int, dict[int, dict[str, str]]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    books = source.findall('.//tei:div[@subtype="book"]', NAMESPACE)
    if len(books) != 13:
        raise ValueError(f"Expected 13 canonical books; found {len(books)}")

    entries: list[dict[str, Any]] = []
    summaries: list[dict[str, Any]] = []

    for book_node in books:
        book = int(book_node.attrib["n"])
        normalized_definitions = 0
        proposition_count = 0
        foundation_count = 0

        for group in book_node.findall('./tei:div[@subtype="type"]', NAMESPACE):
            group_name = group.attrib["n"]
            if group_name.startswith("prop"):
                kind = "proposition"
            elif group_name.startswith("def"):
                kind = "definition"
            elif group_name == "post":
                kind = "postulate"
            elif group_name == "comm_not":
                kind = "common-notion"
            else:
                raise ValueError(f"Unexpected TEI group {group_name!r} in book {book}")

            for ordinal, element in enumerate(group.findall('./tei:div[@subtype="number"]', NAMESPACE), start=1):
                source_number = int(element.attrib["n"])
                if kind == "definition":
                    normalized_definitions += 1
                    number = normalized_definitions
                    entry_id = f"euclid-{book}-def-{number}"
                elif kind == "postulate":
                    number = source_number
                    entry_id = f"euclid-{book}-post-{number}"
                    foundation_count += 1
                elif kind == "common-notion":
                    # Heath preserves older source numbering 1,2,3,7,8 but
                    # explicitly prints canonical common notions 1-5.
                    number = ordinal
                    entry_id = f"euclid-{book}-cn-{number}"
                    foundation_count += 1
                else:
                    number = source_number
                    entry_id = f"euclid-{book}-{number}"
                    proposition_count += 1

                paragraphs = element.findall("./tei:p", NAMESPACE)
                dependencies: dict[str, dict[str, Any]] = {}
                rendered = [normalize(render_xml(paragraph, dependencies)) for paragraph in paragraphs]
                rendered = [paragraph for paragraph in rendered if paragraph]
                source_missing = not rendered
                if source_missing and kind == "proposition":
                    raise ValueError(f"Source proposition {entry_id} has no statement")
                if rendered:
                    # Definitions, postulates and common notions are not
                    # proved.  Some occupy multiple genuine TEI paragraphs:
                    # e.g. I.Post.1 starts with an introductory paragraph,
                    # while XI.Def.18 continues its definition in a second.
                    # Preserve all of them as the statement, never as a
                    # fabricated “proof” of an axiom.
                    statement = rendered[0] if kind == "proposition" else " ".join(rendered)
                else:
                    statement = "[The upstream Perseus TEI record contains an empty paragraph; no definition text is supplied.]"
                proof = "\n\n".join(rendered[1:]) if kind == "proposition" else ""
                if kind == "proposition" and not proof:
                    raise ValueError(f"Proposition {entry_id} is missing its authentic proof")

                historical = historical_books.get(book, {}).get(number) if kind == "proposition" else None
                source_urn = f"urn:cts:greekLit:tlg1799.tlg001.perseus-eng2:{book}.{group_name}.{source_number}"
                entry: dict[str, Any] = {
                    "id": entry_id,
                    "book": book,
                    "proposition": number,
                    "kind": kind,
                    "title": (
                        f"第 {book} 卷定义 {number}：上游 TEI 原文缺失"
                        if source_missing
                        else concept_title(book, statement, kind, number, historical)
                    ),
                    "englishTitle": re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", statement),
                    "statement": statement,
                    "proof": proof,
                    "dependencies": list(dependencies.values()),
                    "geometry": choose_geometry(book, statement, kind, number),
                    "sourceUrl": f"https://scaife.perseus.org/reader/{source_urn}/",
                    "sourceGroup": group_name,
                    "sourceNumber": source_number,
                    "hasSourceFigure": element.find(".//tei:figure", NAMESPACE) is not None,
                }
                if source_missing:
                    entry["sourceMissing"] = True
                if historical:
                    entry["historicalChineseStatement"] = historical["statement"]
                    entry["historicalChineseProof"] = historical["proof"]
                    entry["historicalChineseSourceUrl"] = historical["sourceUrl"]
                entries.append(entry)

        expected_propositions = EXPECTED_PROPOSITIONS[book - 1]
        expected_definitions = EXPECTED_DEFINITIONS[book - 1]
        if proposition_count != expected_propositions or normalized_definitions != expected_definitions:
            raise ValueError(
                f"Book {book} count mismatch: propositions {proposition_count}/{expected_propositions}; "
                f"definitions {normalized_definitions}/{expected_definitions}"
            )
        summaries.append(
            {
                "book": book,
                "roman": ROMAN[book - 1],
                "title": BOOK_TITLES[book - 1],
                "propositions": proposition_count,
                "definitions": normalized_definitions,
                "foundations": foundation_count,
                "entries": proposition_count + normalized_definitions + foundation_count,
            }
        )

    known_ids = {entry["id"] for entry in entries}
    for entry in entries:
        entry["dependencies"] = [reference for reference in entry["dependencies"] if reference["id"] in known_ids]
        # Source typos occasionally contain links to interpolated lemmas or
        # unavailable propositions; avoid creating dead in-app links.
        entry["statement"] = re.sub(
            r"\[([^\]]+)\]\(/principles/([^\)]+)\)",
            lambda match: match.group(0) if match.group(2) in known_ids else match.group(1),
            entry["statement"],
        )
        entry["proof"] = re.sub(
            r"\[([^\]]+)\]\(/principles/([^\)]+)\)",
            lambda match: match.group(0) if match.group(2) in known_ids else match.group(1),
            entry["proof"],
        )

    expected_total = sum(EXPECTED_PROPOSITIONS) + sum(EXPECTED_DEFINITIONS) + 10
    if len(entries) != expected_total or len(known_ids) != expected_total:
        raise ValueError(f"Expected {expected_total} unique entries; found {len(entries)} / {len(known_ids)}")
    return entries, summaries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xml", type=Path, help="Use an already downloaded Perseus TEI XML source")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "src/lib/euclid-data.json",
        help="Generated corpus destination",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(tempfile.gettempdir()) / "mathforge-euclid-corpus",
        help="Scratch cache for downloaded, reproducible upstream material",
    )
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    source_path = args.xml or args.cache_dir / "perseus-heath-eng2.xml"
    if not source_path.exists():
        source_path.write_bytes(fetch_bytes(SOURCE_URL))

    source_bytes = source_path.read_bytes()
    root = ET.fromstring(source_bytes)
    license_element = root.find(".//tei:licence", NAMESPACE)
    if license_element is None or license_element.attrib.get("target") != LICENSE_URL:
        raise ValueError("Upstream source no longer declares the expected CC BY-SA 4.0 license")

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {book: executor.submit(fetch_historical_book, book, args.cache_dir) for book in HISTORICAL_BOOKS}
        historical_books = {book: future.result() for book, future in futures.items()}

    entries, books = build_entries(root, historical_books)
    payload = {
        "source": {
            "title": "The Thirteen Books of Euclid's Elements",
            "author": "Euclid",
            "translator": "Thomas Little Heath",
            "publisher": "Perseus Digital Library · Tufts University",
            "year": 1908,
            "url": SOURCE_PAGE,
            "license": "CC BY-SA 4.0",
            "licenseUrl": LICENSE_URL,
            "urn": "urn:cts:greekLit:tlg1799.tlg001.perseus-eng2",
            "sha256": hashlib.sha256(source_bytes).hexdigest(),
            "historicalChinese": {
                "title": "几何原本（徐光启、利玛窦 1607 年中译）",
                "translators": ["徐光启", "利玛窦"],
                "url": CHINESE_SOURCE_PAGE,
                "license": "Public Domain / 维基文库整理文本 CC BY-SA 4.0",
                "matchedBooks": list(HISTORICAL_BOOKS),
                "excludedReason": "第五卷古译有 34 题而 Heath 正文有 25 题；第七至十三卷尚未录入维基文库，因此不做未经核验的逐题对齐。",
            },
        },
        "books": books,
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "output": str(args.output),
                "sourceSha256": payload["source"]["sha256"],
                "books": len(books),
                "propositions": sum(book["propositions"] for book in books),
                "definitions": sum(book["definitions"] for book in books),
                "foundations": sum(book["foundations"] for book in books),
                "entries": len(entries),
                "historicalChinesePropositions": sum("historicalChineseProof" in entry for entry in entries),
                "citationEdges": sum(len(entry["dependencies"]) for entry in entries),
                "bytes": args.output.stat().st_size,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (urllib.error.URLError, ValueError, ET.ParseError) as error:
        print(f"EUCLID_BUILD_FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
