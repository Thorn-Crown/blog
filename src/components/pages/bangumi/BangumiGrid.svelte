<script lang="ts">
import { onMount } from "svelte";
import GridSkeleton from "@/components/common/GridSkeleton.svelte";
import TabNav from "@/components/common/TabNav.svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { UserSubjectCollection } from "@/types/bangumi";
import type { NsfwMode } from "@/types/nsfw";
import { fillMissingBangumiDates } from "@/utils/bangumi-date";
import type { BangumiRegion } from "@/utils/bangumi-region";
import { fetchBangumiRegions } from "@/utils/bangumi-region";
import { filterNsfw, isBangumiNsfw } from "@/utils/nsfw-utils";
import BangumiSection from "./BangumiSection.svelte";

interface Props {
	// 静态模式：直接传入数据
	tabs?: Array<{ id: string; name: string; count: number }>;
	initialActiveTab?: string;
	bangumiData?: Record<string, UserSubjectCollection[]>;
	subjectBaseUrl?: string;
	// 静态模式：构建时已抓取好的地区分类
	initialRegions?: Record<number, BangumiRegion>;
	// 动态模式：传入获取配置
	fetchConfig?: {
		username: string;
		apiUrl: string;
		categories: Record<string, boolean>;
		categoryOrder: string[];
		pagination: { limit: number; delay: number; maxTotal: number };
		nsfw?: NsfwMode;
	};
	nsfw?: NsfwMode; // NSFW 处理："off" | "blur" | "hide"
}

const {
	tabs: staticTabs,
	initialActiveTab,
	bangumiData: staticData,
	subjectBaseUrl,
	initialRegions,
	fetchConfig,
	nsfw,
}: Props = $props();

const nsfwMode = $derived(nsfw ?? fetchConfig?.nsfw ?? "off");

const isDynamic = $derived(!!fetchConfig);

// ── 客户端缓存（SWR）──────────────────────────────────
// 命中缓存时秒开，后台静默刷新；按 NSFW 模式分桶，TTL 1 小时
interface BangumiCachePayload {
	ts: number;
	tabs: Array<{ id: string; name: string; count: number }>;
	data: Record<string, UserSubjectCollection[]>;
	regions: Record<number, BangumiRegion>;
}
const CACHE_TTL = 60 * 60 * 1000;

function dataCacheKey(): string {
	return `bangumi-dynamic-cache-v1:${nsfwMode}`;
}

function readDataCache(): BangumiCachePayload | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(dataCacheKey());
		if (!raw) return null;
		const parsed = JSON.parse(raw) as BangumiCachePayload;
		if (Date.now() - parsed.ts > CACHE_TTL) return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeDataCache(payload: BangumiCachePayload) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(dataCacheKey(), JSON.stringify(payload));
	} catch {
		// 存储不可用或已满时静默忽略
	}
}

// 状态
let activeTab = $state("");
// 是否显示骨架屏：动态模式默认加载，onMount 命中缓存会立即关闭
let fetchLoading = $state(!!fetchConfig);
const loading = $derived(isDynamic && fetchLoading);
let error = $state(false);

// 初始化 activeTab / 当 fetchConfig 变化时重置错误状态
// 加载状态由 onMount 根据缓存决定，避免缓存命中时闪一下骨架屏
$effect(() => {
	if (initialActiveTab) {
		activeTab = initialActiveTab;
	}
	if (fetchConfig) {
		error = false;
	}
});
let errorTitle = $state("");
let errorDesc = $state("");
let updateTimestamp = $state("");

// 动态模式的数据
let dynamicTabs = $state<Array<{ id: string; name: string; count: number }>>(
	[],
);
let dynamicData = $state<Record<string, UserSubjectCollection[]>>({});

// 条目地区分类（仅动画使用），按条目 ID 映射
let regionMap = $state<Record<number, BangumiRegion>>(initialRegions ?? {});

// 合并后的数据
const tabs = $derived(staticTabs || dynamicTabs);
const bangumiData = $derived(staticData || dynamicData);

const categoryMap: Record<string, { name: string; subjectType: number }> = {
	book: { name: i18n(I18nKey.bangumiCategoryBook), subjectType: 1 },
	anime: { name: i18n(I18nKey.bangumiCategoryAnime), subjectType: 2 },
	music: { name: i18n(I18nKey.bangumiCategoryMusic), subjectType: 3 },
	game: { name: i18n(I18nKey.bangumiCategoryGame), subjectType: 4 },
	real: { name: i18n(I18nKey.bangumiCategoryReal), subjectType: 6 },
};

function handleTabChange(tabId: string) {
	activeTab = tabId;
}

async function fetchCategory(
	apiUrl: string,
	username: string,
	subjectType: number,
	pagination: { limit: number; delay: number; maxTotal: number },
): Promise<UserSubjectCollection[]> {
	const { limit, delay, maxTotal } = pagination;
	let offset = 0;
	const allItems: UserSubjectCollection[] = [];

	while (true) {
		if (maxTotal > 0 && allItems.length >= maxTotal) break;
		const url = `${apiUrl}/v0/users/${username}/collections?subject_type=${subjectType}&limit=${limit}&offset=${offset}`;
		const resp = await fetch(url, { headers: { Accept: "application/json" } });
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		const data = await resp.json();
		const batch: UserSubjectCollection[] = data.data || [];
		if (batch.length > 0) {
			allItems.push(...batch);
			offset += limit;
			if (batch.length < limit) break;
			await new Promise((r) => setTimeout(r, delay));
		} else {
			break;
		}
	}
	return allItems;
}

function tabsDiffer(
	a: Array<{ id: string; count: number }>,
	b: Array<{ id: string; count: number }>,
): boolean {
	if (a.length !== b.length) return true;
	return a.some((t, i) => t.id !== b[i].id || t.count !== b[i].count);
}

function dataDiffer(
	a: Record<string, UserSubjectCollection[]>,
	b: Record<string, UserSubjectCollection[]>,
): boolean {
	const keys = Object.keys(a);
	if (keys.length !== Object.keys(b).length) return true;
	for (const k of keys) {
		const aList = a[k];
		const bList = b[k];
		const la = aList?.length ?? 0;
		const lb = bList?.length ?? 0;
		if (la !== lb) return true;
		if (la > 0 && aList && bList) {
			if (
				aList[0].subject_id !== bList[0].subject_id ||
				aList[la - 1].subject_id !== bList[la - 1].subject_id
			) {
				return true;
			}
		}
	}
	return false;
}

async function enrichAllDates(
	data: Record<string, UserSubjectCollection[]>,
	apiUrl: string,
): Promise<Record<string, UserSubjectCollection[]>> {
	const entries = await Promise.all(
		Object.entries(data).map(async ([key, items]) => {
			return [key, await fillMissingBangumiDates(items, apiUrl)] as const;
		}),
	);
	return Object.fromEntries(entries) as Record<string, UserSubjectCollection[]>;
}

// 并行补全地区 + 年份，完成后更新状态并写入缓存（不阻塞首屏）
async function enrichAndCache(
	data: Record<string, UserSubjectCollection[]>,
	tabs: Array<{ id: string; name: string; count: number }>,
	baseRegions: Record<number, BangumiRegion>,
	apiUrl: string,
) {
	const animeItems = data.anime || [];
	const regionPromise =
		animeItems.length > 0
			? fetchBangumiRegions(
					apiUrl,
					animeItems.map((item) => item.subject_id),
				).catch(() => ({}) as Record<number, BangumiRegion>)
			: Promise.resolve({} as Record<number, BangumiRegion>);

	const [newRegions, datedData] = await Promise.all([
		regionPromise,
		enrichAllDates(data, apiUrl),
	]);

	const mergedRegions = { ...baseRegions, ...newRegions };
	dynamicData = datedData;
	regionMap = mergedRegions;
	writeDataCache({
		ts: Date.now(),
		tabs,
		data: datedData,
		regions: mergedRegions,
	});
}

async function loadDynamicData(background: boolean) {
	if (!fetchConfig) return;
	const { username, apiUrl, categories, categoryOrder, pagination } =
		fetchConfig;

	const enabled: string[] = [];
	for (const [k, v] of Object.entries(categories)) {
		if (v) enabled.push(k);
	}
	if (categoryOrder.length > 0) {
		enabled.sort((a, b) => {
			const ai = categoryOrder.indexOf(a);
			const bi = categoryOrder.indexOf(b);
			if (ai === -1 && bi === -1) return 0;
			if (ai === -1) return 1;
			if (bi === -1) return -1;
			return ai - bi;
		});
	}

	type FetchOk = { key: string; name: string; data: UserSubjectCollection[] };
	type FetchFail = { key: string; error: unknown };

	// 并行抓取所有分类，避免串行累计延迟
	const results = await Promise.all(
		enabled.map(async (catKey): Promise<FetchOk | FetchFail | null> => {
			const info = categoryMap[catKey];
			if (!info) return null;
			try {
				const data = await fetchCategory(
					apiUrl,
					username,
					info.subjectType,
					pagination,
				);
				// NSFW 拦截：hide 模式下过滤掉 NSFW 条目，保持标签页计数一致
				const filtered = filterNsfw(data, nsfwMode, isBangumiNsfw);
				return { key: catKey, name: info.name, data: filtered };
			} catch (error) {
				return { key: catKey, error };
			}
		}),
	);

	const failed = results.find((r): r is FetchFail => !!r && "error" in r);
	if (failed) {
		console.error(
			`[Bangumi] Failed to fetch ${failed.key} data:`,
			failed.error,
		);
		if (!background) {
			fetchLoading = false;
			error = true;
			errorTitle = i18n(I18nKey.bangumiFetchError);
			errorDesc = i18n(I18nKey.bangumiFetchErrorDesc);
		}
		return;
	}

	const ok = results.filter((r): r is FetchOk => !!r && !("error" in r));

	if (ok.length === 0 || ok.every((r) => r.data.length === 0)) {
		if (!background) {
			fetchLoading = false;
			error = true;
			errorTitle = i18n(I18nKey.bangumiNoData);
			errorDesc = i18n(I18nKey.bangumiNoDataDescription);
		}
		return;
	}

	const newTabs = ok.map((r) => ({
		id: r.key,
		name: r.name,
		count: r.data.length,
	}));
	const newData: Record<string, UserSubjectCollection[]> = {};
	for (const r of ok) newData[r.key] = r.data;

	if (!background) {
		dynamicTabs = newTabs;
		dynamicData = newData;
		activeTab = newTabs[0].id;
		fetchLoading = false;
	} else if (
		tabsDiffer(dynamicTabs, newTabs) ||
		dataDiffer(dynamicData, newData)
	) {
		// 后台刷新：数据有变化才更新，避免无谓重渲染
		dynamicTabs = newTabs;
		dynamicData = newData;
	}

	const now = new Date();
	const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
	updateTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

	// 异步补全地区 + 年份，完成后写缓存（不阻塞首屏）
	void enrichAndCache(newData, newTabs, regionMap, apiUrl);
}

// 从 URL hash 恢复 tab
function restoreTabFromHash() {
	if (!isDynamic) {
		const hash = window.location.hash.replace(/^#/, "");
		if (hash) {
			try {
				const decoded = decodeURIComponent(hash);
				if (tabs.some((t) => t.id === decoded)) {
					activeTab = decoded;
				}
			} catch {}
		}
	}
}

onMount(async () => {
	restoreTabFromHash();
	if (!isDynamic) return;

	// 命中缓存：立即渲染旧数据，后台静默刷新（SWR），实现秒开
	const cached = readDataCache();
	if (cached && cached.tabs.length > 0) {
		dynamicTabs = cached.tabs;
		dynamicData = cached.data;
		regionMap = cached.regions;
		activeTab = cached.tabs[0]?.id || "";
		fetchLoading = false;
		void loadDynamicData(true);
		return;
	}

	fetchLoading = true;
	await loadDynamicData(false);
});
</script>

{#if isDynamic && loading}
  <GridSkeleton />
{:else if isDynamic && error}
  <div class="text-center py-16">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-(--btn-regular-bg) rounded-full mb-6 border border-(--line-divider)">
      <span class="text-[2rem] text-red-500">⚠</span>
    </div>
    <h2 class="text-xl font-semibold text-black/80 dark:text-white/80 mb-3">{errorTitle}</h2>
    <p class="text-black/60 dark:text-white/60 mb-4 max-w-md mx-auto">{errorDesc}</p>
  </div>
{:else if tabs.length > 0}
  <TabNav {tabs} {activeTab} onTabChange={handleTabChange} />

  {#each tabs as tab (tab.id)}
    <BangumiSection
      sectionId={tab.id}
      items={bangumiData[tab.id] || []}
      isActive={tab.id === activeTab}
      itemsPerPage={24}
      {subjectBaseUrl}
      regionMap={tab.id === "anime" ? regionMap : undefined}
      nsfw={nsfwMode}
    />
  {/each}
{/if}
