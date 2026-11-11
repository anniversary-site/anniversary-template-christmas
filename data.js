// 크리스마스 마켓 데모 데이터. 고객 사이트는 urluv-site.js가 API 응답으로 내용을 바꿉니다.
window.SITE = {
  title: "URLUV 겨울 마켓",
  siteMode: "christmas",
  passwordSalt: "winter-market:",
  passwordHash: "",
  loginTitle: "URLUV 겨울 마켓",
  loginMessage: "우리의 크리스마스 마켓에 놀러오세요.\n(데모는 비밀번호 없이 둘러볼 수 있어요.)",
  userName: "겨울 마켓 방문자",
  startDate: "2026-12-25",
  expiresOn: "",
  renewalNoticeDays: 3,
  renewalUrl: "https://urluv.shop/",
  names: ["우리의 겨울"],
  startMenu: "겨울 마켓",
  theme: { main: "#bd5145", dark: "#315247", light: "#fff1cf", bg: "#315247" },

  // 마켓 가판대가 바탕화면 아이콘을 대신합니다.
  icons: [
    { id: "photo", label: "사진관", icon: "assets/icons/market-photo.svg", type: "folder", ref: "photo", windowTitle: "우리의 겨울 사진" },
    { id: "letter", label: "편지 우체국", icon: "assets/icons/market-post.svg", type: "note", ref: "letter", windowTitle: "크리스마스 편지" },
    { id: "music", label: "캐럴 무대", icon: "assets/icons/market-music.svg", type: "folder", ref: "record", windowTitle: "겨울 플레이리스트" },
    { id: "gift", label: "선물 놓는 곳", icon: "assets/icons/market-gift.svg", type: "gift", windowTitle: "선물 남기기" },
    { id: "tree", label: "우리의 트리", icon: "assets/icons/market-tree.svg", type: "information", windowTitle: "우리의 크리스마스" }
  ],

  information: { specialDate: "12월 25일", specialPlace: "우리의 겨울 마켓", story: "올해도 함께여서 참 좋았어." },
  notes: {
    letter: { title: "크리스마스 편지", text: "올해도 함께여서 참 좋았어.\n\n우리의 겨울을 오래 간직하자.\n\n메리 크리스마스!" }
  },
  folders: {
    photo: {
      title: "겨울 사진관",
      files: [
        { name: "첫눈.jpg", type: "image", src: "", caption: "첫눈 오던 날" },
        { name: "마켓 산책.jpg", type: "image", src: "", caption: "마켓을 걷던 밤" },
        { name: "우리의 트리.jpg", type: "image", src: "", caption: "올해의 우리" }
      ]
    },
    record: {
      title: "겨울 플레이리스트",
      files: [{ name: "겨울, 그리고 우리", type: "audio", src: "" }]
    }
  },
  music: {
    title: "겨울, 그리고 우리",
    tracks: [
      { title: "우리의 크리스마스 노래", artist: "함께 듣는 음악", url: "https://www.youtube.com/watch?v=hGqYdubpcCM" }
    ]
  },
  frames: [
    { id: "holly", label: "Holly", color: "#bd5145", deco: "✦" },
    { id: "snow", label: "Snow", color: "#759aa0", deco: "❄" },
    { id: "pine", label: "Pine", color: "#315247", deco: "✿" }
  ]
};
