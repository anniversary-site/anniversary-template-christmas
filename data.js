// 크리스마스 마켓 데모 데이터. 고객 사이트는 urluv-site.js가 API 응답으로 내용을 바꿉니다.
window.SITE = {
  title: "URLUV CHRISTMAS",
  siteMode: "christmas",
  passwordSalt: "winter-market:",
  passwordHash: "",
  loginTitle: "URLUV CHRISTMAS",
  loginMessage: "우리의 크리스마스 마켓에 놀러오세요.\n(데모는 비밀번호 없이 둘러볼 수 있어요.)",
  userName: "겨울 마켓 방문자",
  startDate: "2026-12-25",
  expiresOn: "",
  renewalNoticeDays: 3,
  renewalUrl: "https://urluv.shop/",
  names: ["우리의 겨울"],
  startMenu: "CHRISTMAS",
  theme: { main: "#bd5145", dark: "#315247", light: "#fff1cf", bg: "#315247" },

  // 마켓 가판대가 바탕화면 아이콘을 대신합니다.
  icons: [
    { id: "photo", label: "사진관", type: "gallery", highlight: "assets/highlights/maps/photo-studio.jpg" },
    { id: "letter", label: "편지 우체국", type: "note", ref: "letter", windowTitle: "크리스마스 편지", highlight: "assets/highlights/maps/post-office.jpg" },
    { id: "music", label: "캐럴 무대", type: "folder", ref: "record", windowTitle: "겨울 플레이리스트", highlight: "assets/highlights/maps/music-stage.jpg" },
    { id: "market", label: "크리스마스 마켓", type: "paint", highlight: "assets/highlights/maps/christmas-market.jpg" },
    { id: "tree", label: "우리의 트리", type: "information", windowTitle: "우리의 크리스마스", highlight: "assets/highlights/maps/christmas-tree.jpg" },
    { id: "booth", label: "포토부스", type: "photobooth", highlight: "assets/highlights/maps/photo-booth.jpg" },
    { id: "internet", label: "마켓 안내", type: "link", url: "https://urluv.shop/", highlight: "assets/highlights/maps/market-sign.jpg" },
    { id: "trash", label: "분리수거함", type: "trash", highlight: "assets/highlights/maps/recycling-bin.jpg" },
    { id: "game", label: "눈사람 게임", type: "game", highlight: "assets/highlights/maps/snowman-sled.jpg" }
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
    video: {
      title: "겨울 영상",
      files: [{ name: "우리의 크리스마스.mp4", type: "video", src: "", caption: "함께 보낸 겨울의 순간" }]
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
