import type { Book } from "@/types/book";

/**
 * 书房页面配置 —— 手动维护你的书籍列表。
 *
 * 每本书字段说明（类型见 src/types/book.ts）：
 *   id      唯一标识，自定义即可（如 "liaofan-six-lessons"）
 *   title   书名
 *   author  作者
 *   cover   封面图片 URL。推荐：
 *             - 豆瓣 CDN 直链：打开豆瓣书页，右键封面「复制图像地址」，形如
 *               https://img9.doubanio.com/view/subject/l/public/sxxxxxxx.jpg
 *             - 或放在 src/assets/ 下用本地图
 *   rating  我的评分 0-10，可选
 *   status  阅读状态："wish" 想读 | "reading" 在读 | "read" 读过
 *                    | "on-hold" 搁置 | "dropped" 放弃
 *   review  一句话短评，可选
 *   tags    标签数组，用于筛选，如 ["哲学", "古典"]，可选
 *   link    外部链接（豆瓣书页等），可选；设置后卡片可点击跳转
 *   year    出版年份或阅读年份，可选
 *
 * 以下为示例数据，请替换为你自己的书籍。
 */
export const booksConfig = {
	books: [
		{
			id: "liaofan-six-lessons",
			title: "了凡四训",
			author: "袁了凡",
			cover: "https://img9.doubanio.com/view/subject/l/public/s29539556.webp",
			rating: 9,
			status: "read",
			review: "立命之学，改过之法，积善之方，谦德之效。",
			tags: ["哲学", "古典", "修身"],
			link: "https://book.douban.com/subject/27102950/",
			year: "2011",
		},
		{
			id: "to-live",
			title: "活着",
			author: "余华",
			cover: "https://img9.doubanio.com/view/subject/l/public/s29869926.webp",
			rating: 9.5,
			status: "read",
			review: "人是为活着本身而活着，而不是为了活着之外的任何事物所活着。",
			tags: ["小说", "当代文学"],
			link: "https://book.douban.com/subject/4913064/",
			year: "2012",
		},
		{
			id: "sapiens",
			title: "人类简史",
			author: "尤瓦尔·赫拉利",
			cover: "https://img9.doubanio.com/view/subject/l/public/s27814883.webp",
			rating: 9,
			status: "reading",
			review: "从认知革命到科学革命，重新审视人类这个物种。",
			tags: ["历史", "人类学"],
			link: "https://book.douban.com/subject/25985021/",
			year: "2014",
		},
		{
			id: "one-hundred-years-of-solitude",
			title: "百年孤独",
			author: "加西亚·马尔克斯",
			cover: "https://img9.doubanio.com/view/subject/l/public/s27237850.jpg",
			rating: 0,
			status: "wish",
			tags: ["小说", "魔幻现实主义"],
			link: "https://book.douban.com/subject/6082808/",
			year: "2011",
		},
		{
			id: "meditations",
			title: "沉思录",
			author: "马可·奥勒留",
			cover: "https://img9.doubanio.com/view/subject/l/public/s2825021.webp",
			rating: 8.5,
			status: "on-hold",
			review: "斯多葛哲学的枕边书，随时翻几页。",
			tags: ["哲学", "斯多葛"],
			link: "https://book.douban.com/subject/2359003/",
			year: "2008",
		},
	] as Book[],
};
