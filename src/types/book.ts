// 书籍数据类型定义 —— 书房页面手动维护的书籍

/** 阅读状态 */
export type BookStatus = "wish" | "reading" | "read" | "on-hold" | "dropped";

/** 单本书籍 */
export interface Book {
	/** 唯一标识，推荐用豆瓣 subject id 或自定义字符串 */
	id: string;
	/** 书名 */
	title: string;
	/** 作者 */
	author: string;
	/** 封面图片 URL（豆瓣 CDN 直链 / 本地图 / 任意图床） */
	cover: string;
	/** 我的评分 0-10，可选 */
	rating?: number;
	/** 阅读状态 */
	status: BookStatus;
	/** 短评 / 一句话读后感，可选 */
	review?: string;
	/** 标签，用于筛选，如 ["哲学", "古典"]，可选 */
	tags?: string[];
	/** 外部链接（豆瓣书页等），可选；设置后卡片可点击跳转 */
	link?: string;
	/** 出版年份或阅读年份，可选 */
	year?: string;
}
