// Bangumi 封面本地覆盖
// 键为 Bangumi 条目 ID，值为 public 目录下图片的路径。
// 覆盖只影响本站显示，不会修改 Bangumi 上的数据；文件缺失时会自动回落到原封面。
// 图片放置位置：public/images/bangumi/<条目ID>.avif
export const bangumiCoverOverrides: Record<number, string> = {
	// 尸兄
	62115: "/images/bangumi/62115.avif",
};
