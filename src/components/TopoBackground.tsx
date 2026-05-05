export default function TopoBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{ backgroundColor: '#080e18' }}
    >
      <svg
        viewBox="0 0 1440 810"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">

          {/* === MAIN ISLAND CLUSTER (lower-left) === */}
          <path d="M 240,705 C 260,692 285,696 295,712 C 305,728 298,750 278,758 C 258,766 232,756 222,740 C 212,724 220,718 240,705 Z"
            stroke="#22c55e" strokeWidth="1.4" strokeOpacity="0.9" />
          <path d="M 200,668 C 235,640 292,646 328,672 C 364,698 366,748 340,778 C 314,808 264,820 226,810 C 188,800 158,772 150,742 C 142,712 165,696 200,668 Z"
            stroke="#22c55e" strokeWidth="1.3" strokeOpacity="0.82" />
          <path d="M 155,622 C 205,585 285,592 335,626 C 385,660 394,722 364,762 C 334,802 270,828 222,824 C 174,820 128,790 114,754 C 100,718 105,659 155,622 Z"
            stroke="#22c55e" strokeWidth="1.2" strokeOpacity="0.72" />
          <path d="M 102,568 C 168,522 275,530 338,572 C 401,614 420,690 386,742 C 352,794 275,828 218,826 C 161,824 104,792 82,752 C 60,712 36,614 102,568 Z"
            stroke="#22c55e" strokeWidth="1.2" strokeOpacity="0.62" />
          <path d="M 45,508 C 128,452 268,462 345,514 C 422,566 448,654 412,718 C 376,782 285,824 216,826 C 147,828 76,794 46,750 C 16,706 -38,564 45,508 Z"
            stroke="#22c55e" strokeWidth="1.1" strokeOpacity="0.52" />
          <path d="M -18,444 C 82,378 265,390 356,452 C 447,514 480,618 440,696 C 400,774 295,824 215,828 C 135,832 48,796 10,748 C -28,700 -114,510 -18,444 Z"
            stroke="#22c55e" strokeWidth="1.1" strokeOpacity="0.42" />
          <path d="M -82,378 C 34,302 260,318 368,392 C 476,466 514,582 468,674 C 422,766 304,824 215,830 C 126,836 20,798 -25,746 C -70,694 -198,454 -82,378 Z"
            stroke="#22c55e" strokeWidth="1.0" strokeOpacity="0.32" />
          <path d="M -148,310 C -14,224 256,244 380,330 C 504,416 548,546 498,652 C 448,758 314,824 215,832 C 116,840 -8,800 -60,744 C -112,688 -282,396 -148,310 Z"
            stroke="#22c55e" strokeWidth="1.0" strokeOpacity="0.23" />
          <path d="M -215,242 C -65,146 252,170 394,268 C 536,366 582,510 528,630 C 474,750 322,824 215,834 C 108,844 -36,802 -95,742 C -154,682 -365,338 -215,242 Z"
            stroke="#22c55e" strokeWidth="0.9" strokeOpacity="0.15" />
          <path d="M -285,172 C -118,66 248,96 408,206 C 568,316 618,474 558,608 C 498,742 330,824 215,836 C 100,848 -65,804 -130,740 C -195,676 -452,278 -285,172 Z"
            stroke="#22c55e" strokeWidth="0.9" strokeOpacity="0.08" />

          {/* === SMALL ISLAND 1 (upper area ~800, 200) === */}
          <path d="M 800,192 C 812,180 830,183 837,198 C 844,213 836,232 820,237 C 804,242 786,232 782,216 C 778,200 788,204 800,192 Z"
            stroke="#22c55e" strokeWidth="1.1" strokeOpacity="0.65" />
          <path d="M 780,170 C 800,152 836,156 852,180 C 868,204 858,240 835,252 C 812,264 780,252 764,230 C 748,208 760,188 780,170 Z"
            stroke="#22c55e" strokeWidth="1.0" strokeOpacity="0.48" />
          <path d="M 758,146 C 786,122 834,127 856,158 C 878,189 866,236 840,252 C 814,268 774,256 754,232 C 734,208 730,170 758,146 Z"
            stroke="#22c55e" strokeWidth="0.9" strokeOpacity="0.32" />
          <path d="M 734,120 C 772,90 838,96 864,134 C 890,172 878,230 848,252 C 818,274 770,262 746,234 C 722,206 696,150 734,120 Z"
            stroke="#22c55e" strokeWidth="0.8" strokeOpacity="0.18" />

          {/* === SMALL ISLAND 2 (mid-right ~1150, 430) === */}
          <path d="M 1150,422 C 1162,410 1180,413 1186,428 C 1192,443 1183,462 1168,466 C 1153,470 1136,460 1132,444 C 1128,428 1138,434 1150,422 Z"
            stroke="#22c55e" strokeWidth="1.0" strokeOpacity="0.6" />
          <path d="M 1130,400 C 1150,383 1184,387 1198,410 C 1212,433 1202,468 1178,478 C 1154,488 1122,476 1108,452 C 1094,428 1110,417 1130,400 Z"
            stroke="#22c55e" strokeWidth="0.9" strokeOpacity="0.44" />
          <path d="M 1108,376 C 1136,354 1188,359 1208,388 C 1228,417 1216,464 1188,478 C 1160,492 1118,480 1100,454 C 1082,428 1080,398 1108,376 Z"
            stroke="#22c55e" strokeWidth="0.8" strokeOpacity="0.28" />
          <path d="M 1085,350 C 1120,322 1190,328 1216,364 C 1242,400 1230,458 1198,476 C 1166,494 1114,482 1092,454 C 1070,426 1050,378 1085,350 Z"
            stroke="#22c55e" strokeWidth="0.8" strokeOpacity="0.16" />

          {/* === SMALL ISLAND 3 (bottom-right ~1310, 640) === */}
          <path d="M 1310,632 C 1322,620 1340,623 1347,638 C 1354,653 1346,672 1330,676 C 1314,680 1296,670 1292,654 C 1288,638 1298,644 1310,632 Z"
            stroke="#22c55e" strokeWidth="1.0" strokeOpacity="0.55" />
          <path d="M 1292,610 C 1312,592 1348,596 1364,620 C 1380,644 1368,680 1342,690 C 1316,700 1280,688 1264,664 C 1248,640 1272,628 1292,610 Z"
            stroke="#22c55e" strokeWidth="0.9" strokeOpacity="0.4" />
          <path d="M 1270,585 C 1298,562 1354,567 1376,598 C 1398,629 1384,676 1354,690 C 1324,704 1280,692 1258,664 C 1236,636 1242,608 1270,585 Z"
            stroke="#22c55e" strokeWidth="0.8" strokeOpacity="0.25" />

        </g>
      </svg>
    </div>
  );
}
