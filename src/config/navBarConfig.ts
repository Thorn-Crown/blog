import {
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/navBarConfig";

// ============================================================================
// 导航栏配置 - 根据顺序动态生成导航栏链接
// NavBar Configuration - Dynamically generate navigation bar links based on order
// ============================================================================
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: NavBarLink[] = [];

	// 主页
	links.push(LinkPresets.Home);

	// 文章及其子菜单
	links.push({
		name: "博客",
		url: "#",
		icon: "hugeicons:quill-write-02",
		children: [
			// 归档
			LinkPresets.Archive,

			// 分类
			LinkPresets.Categories,

			// 标签
			LinkPresets.Tags,

			// 系列
			LinkPresets.Series,
		],
	});

	// 笔记
	links.push({
		name: "笔记",
		url: "/notes/",
		icon: "andrsrxn:notes",
	});

	// 工具导航
	links.push({
		name: "资源",
		url: "/booknav/",
		icon: "carbon:software-resource-cluster",
	});

	// 社交及其子菜单
	// 做减法：收起到「我的」子菜单里，友链已并入下方
	// links.push({
	// 	name: "社交",
	// 	url: "#",
	// 	icon: "material-symbols:group",
	// 	children: [
	// 		// 友链
	// 		LinkPresets.Friends,
	//
	// 		// 留言
	// 		//LinkPresets.Guestbook,
	// 	],
	// });

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "#",
		icon: "bi:person-circle",
		children: [
			// 友链（由原「社交」并入）
			LinkPresets.Friends,

			// 动态
			LinkPresets.Dynamic,

			// 项目
			LinkPresets.Projects,

			// 相册
			LinkPresets.Gallery,

			// 书签导航（顶部「资源」已指向 /booknav/，这里不再重复）
			// LinkPresets.Booknav,

			// 哔哩哔哩追番
			LinkPresets.Bilibili,

			// 番组计划
			LinkPresets.Bangumi,

			// VNDB
			LinkPresets.VNDB,

			// MyAnimeList
			LinkPresets.MAL,

			// 源码仓库（由原「链接」并入）
			{
				name: "GitHub",
				url: "https://github.com/Thorn-Crown/blog",
				external: true,
				icon: "fa7-brands:github",
			},
		],
	});

	// 关于及其子菜单
	// 做减法：打赏页已关闭（pages.sponsor: false），暂时收起整个入口
	// links.push({
	// 	name: "关于",
	// 	url: "#",
	// 	icon: "material-symbols:info",
	// 	children: [
	// 		// 打赏
	// 		LinkPresets.Sponsor,
	//
	// 		// 关于页面
	// 		//LinkPresets.About,
	// 	],
	// });

	// 自定义导航栏链接
	// 做减法：GitHub 已并入「我的」子菜单，暂时收起整个入口
	// links.push({
	// 	name: "链接",
	// 	url: "#",
	// 	icon: "material-symbols:link",
	// 	// 子菜单
	// 	children: [
	// 		{
	// 			name: "GitHub",
	// 			url: "https://github.com/Thorn-Crown/blog",
	// 			external: true,
	// 			icon: "fa7-brands:github",
	// 		},
	// 	],
	// });

	// 文档链接
	// links.push({
	// 	name: "文档",
	// 	url: "https://docs-firefly.cuteleaf.cn",
	// 	external: true,
	// 	icon: "material-symbols:docs",
	// });

	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

// ============================================================================
// 链接预设 - 可自由自定义导航栏链接的名称、图标和URL
// Link Presets - Allows free customization of the name, icon, and URL of navigation bar links
// ============================================================================
export const LinkPresets: Record<string, NavBarLink> = {
	Home: {
		name: "主页",
		url: "/",
		icon: "akar-icons:home-alt1",
	},
	Archive: {
		name: "归档",
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	Categories: {
		name: "分类",
		url: "/categories/",
		icon: "material-symbols:folder-open-rounded",
	},
	Tags: {
		name: "标签",
		url: "/tags/",
		icon: "material-symbols:tag-rounded",
	},
	Series: {
		name: "系列",
		url: "/series/",
		icon: "material-symbols:layers",
	},
	Friends: {
		name: "友链",
		url: "/friends/",
		icon: "akar-icons:link-chain",
		pageKey: "friends",
	},
	Guestbook: {
		name: "留言",
		url: "/guestbook/",
		icon: "material-symbols:chat",
		pageKey: "guestbook",
	},
	Dynamic: {
		name: "动态",
		url: "/dynamic/",
		icon: "material-symbols:forum-rounded",
		pageKey: "dynamic",
	},
	Projects: {
		name: "项目",
		url: "/projects/",
		icon: "andrsrxn:folder-code",
		pageKey: "projects",
	},
	Gallery: {
		name: "相册",
		url: "/gallery/",
		icon: "material-symbols:photo-library",
		pageKey: "gallery",
	},
	Booknav: {
		name: "书签导航",
		url: "/booknav/",
		icon: "andrsrxn:navigation-circle",
		pageKey: "booknav",
	},
	Bilibili: {
		name: "哔哩哔哩",
		url: "/bilibili/",
		icon: "fa7-brands:bilibili",
		pageKey: "bilibili",
	},
	Bangumi: {
		name: "番组计划",
		url: "/bangumi/",
		icon: "material-symbols:movie",
		pageKey: "bangumi",
	},
	VNDB: {
		name: "VNDB",
		url: "/vndb/",
		icon: "material-symbols:chrome-reader-mode-rounded",
		pageKey: "vndb",
	},
	MAL: {
		name: "AnimeList",
		url: "/myanimelist/",
		icon: "material-symbols:menu-book",
		pageKey: "mal",
	},
	Sponsor: {
		name: "打赏",
		url: "/sponsor/",
		icon: "material-symbols:favorite",
		pageKey: "sponsor",
	},
	About: {
		name: "关于我",
		url: "/about/",
		icon: "material-symbols:person",
	},
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
