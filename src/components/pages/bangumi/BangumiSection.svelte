<script lang="ts">
import ClientPagination from "@/components/common/ClientPagination.svelte";
import FilterControls from "@/components/common/FilterControls.svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { UserSubjectCollection } from "@/types/bangumi";
import type { NsfwMode } from "@/types/nsfw";
import type { BangumiRegion } from "@/utils/bangumi-region";
import { filterNsfw, isBangumiNsfw } from "@/utils/nsfw-utils";
import Card from "./Card.svelte";

interface Props {
	sectionId: string;
	items: UserSubjectCollection[];
	isActive: boolean;
	itemsPerPage?: number;
	subjectBaseUrl?: string;
	regionMap?: Record<number, BangumiRegion>; // 条目地区分类（仅动画）
	nsfw?: NsfwMode; // NSFW 处理："off" | "blur" | "hide"
}

const {
	sectionId,
	items,
	isActive,
	itemsPerPage = 24,
	subjectBaseUrl,
	regionMap,
	nsfw = "off",
}: Props = $props();

const STATUS_MAP: Record<number, string> = {
	1: "wish",
	2: "collect",
	3: "doing",
	4: "on_hold",
	5: "dropped",
};

const isGame = $derived(sectionId === "game");
const isBook = $derived(sectionId === "book");
const isMusic = $derived(sectionId === "music");

function getFilterLabel(type: "collect" | "doing" | "wish"): string {
	if (isGame) {
		switch (type) {
			case "collect":
				return i18n(I18nKey.bangumiFilterGamePlayed);
			case "doing":
				return i18n(I18nKey.bangumiFilterGamePlaying);
			case "wish":
				return i18n(I18nKey.bangumiFilterGameWish);
		}
	}
	if (isBook) {
		switch (type) {
			case "collect":
				return i18n(I18nKey.bangumiFilterBookRead);
			case "doing":
				return i18n(I18nKey.bangumiFilterBookReading);
			case "wish":
				return i18n(I18nKey.bangumiFilterBookWish);
		}
	}
	if (isMusic) {
		switch (type) {
			case "collect":
				return i18n(I18nKey.bangumiFilterMusicListened);
			case "doing":
				return i18n(I18nKey.bangumiFilterMusicListening);
			case "wish":
				return i18n(I18nKey.bangumiFilterMusicWish);
		}
	}
	switch (type) {
		case "collect":
			return i18n(I18nKey.bangumiFilterWatched);
		case "doing":
			return i18n(I18nKey.bangumiFilterWatching);
		case "wish":
			return i18n(I18nKey.bangumiFilterWish);
	}
}

// NSFW 拦截：mode === "hide" 时过滤掉命中条目
// 按条目放送/发售日期降序排列（最新在前），未定档的排在最后
const safeItems = $derived(
	[...filterNsfw(items, nsfw, isBangumiNsfw)].sort((a, b) => {
		const dateA = a.subject?.date ?? "";
		const dateB = b.subject?.date ?? "";
		if (!dateA && !dateB) return 0;
		if (!dateA) return 1;
		if (!dateB) return -1;
		return dateB.localeCompare(dateA);
	}),
);

let activeFilter = $state("all");
let activeRegion = $state("all");

function statusOf(item: UserSubjectCollection): string {
	return STATUS_MAP[item.type] ?? "unknown";
}

// 当前地区筛选下的条目：状态计数只统计这一部分
const regionScopedItems = $derived(
	activeRegion === "all"
		? safeItems
		: safeItems.filter((item) => regionOf(item) === activeRegion),
);

const statusCounts = $derived(() => {
	const counts: Record<string, number> = {};
	for (const item of regionScopedItems) {
		const status = statusOf(item);
		counts[status] = (counts[status] || 0) + 1;
	}
	return counts;
});

const filters = $derived(() => {
	const counts = statusCounts();
	return [
		{
			value: "all",
			label: i18n(I18nKey.bangumiFilterAll),
			count: regionScopedItems.length,
		},
		{
			value: "collect",
			label: getFilterLabel("collect"),
			count: counts.collect || 0,
		},
		{
			value: "doing",
			label: getFilterLabel("doing"),
			count: counts.doing || 0,
		},
		{ value: "wish", label: getFilterLabel("wish"), count: counts.wish || 0 },
		{
			value: "on_hold",
			label: i18n(I18nKey.bangumiFilterOnHold),
			count: counts.on_hold || 0,
		},
		{
			value: "dropped",
			label: i18n(I18nKey.bangumiFilterDropped),
			count: counts.dropped || 0,
		},
	].filter((f) => f.value === "all" || f.count > 0);
});

let currentPage = $state(1);

// 地区筛选：仅动画分类、且地区数据已就绪时显示
const hasRegionFilter = $derived(
	sectionId === "anime" && !!regionMap && Object.keys(regionMap).length > 0,
);

function regionOf(item: UserSubjectCollection): BangumiRegion {
	return regionMap?.[item.subject_id] ?? "other";
}

const regionFilters = $derived(() => {
	if (!hasRegionFilter) return [];
	const counts: Record<BangumiRegion, number> = {
		cn: 0,
		jp: 0,
		us: 0,
		other: 0,
	};
	for (const item of safeItems) {
		counts[regionOf(item)] += 1;
	}
	return [
		{
			value: "all",
			label: i18n(I18nKey.bangumiRegionAll),
			count: safeItems.length,
		},
		{
			value: "jp",
			label: i18n(I18nKey.bangumiRegionJp),
			count: counts.jp,
		},
		{
			value: "cn",
			label: i18n(I18nKey.bangumiRegionCn),
			count: counts.cn,
		},
		{
			value: "us",
			label: i18n(I18nKey.bangumiRegionUs),
			count: counts.us,
		},
	].filter((f) => f.value === "all" || f.count > 0);
});

const statusFilteredItems = $derived(
	activeFilter === "all"
		? regionScopedItems
		: regionScopedItems.filter((item) => statusOf(item) === activeFilter),
);

const filteredItems = $derived(statusFilteredItems);

const totalPages = $derived(
	Math.max(1, Math.ceil(filteredItems.length / itemsPerPage)),
);

const pagedItems = $derived(
	filteredItems.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	),
);

function handleFilterChange(filter: string) {
	activeFilter = filter;
	currentPage = 1;
}

function handleRegionChange(region: string) {
	activeRegion = region;
	// 切换地区后，若当前状态在该地区没有条目，就回退到「全部」
	const scoped =
		region === "all"
			? safeItems
			: safeItems.filter((item) => regionOf(item) === region);
	if (
		activeFilter !== "all" &&
		!scoped.some((item) => statusOf(item) === activeFilter)
	) {
		activeFilter = "all";
	}
	currentPage = 1;
}

function goToPage(page: number) {
	if (page >= 1 && page <= totalPages) {
		currentPage = page;
	}
}
</script>

<div class="media-section" class:hidden={!isActive} data-section={sectionId}>
  {#if safeItems.length > 0}
    {#if hasRegionFilter}
      <FilterControls
        filters={regionFilters()}
        activeFilter={activeRegion}
        onFilterChange={handleRegionChange}
      />
    {/if}

    <FilterControls
      filters={filters()}
      activeFilter={activeFilter}
      onFilterChange={handleFilterChange}
    />

    <div class="media-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {#each pagedItems as item (item.subject_id)}
        <div
          class="media-item"
          data-item-section={sectionId}
          data-item-status={STATUS_MAP[item.type as keyof typeof STATUS_MAP] || "unknown"}
        >
          <Card item={item} loadImage={isActive} {subjectBaseUrl} {nsfw} />
        </div>
      {/each}
    </div>

    <ClientPagination
      totalItems={filteredItems.length}
      itemsPerPage={itemsPerPage}
      currentPage={currentPage}
      onPageChange={goToPage}
    />
  {:else}
    <div class="text-center py-12">
      <h3 class="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">{i18n(I18nKey.bangumiNoData)}</h3>
      <p class="text-gray-500 dark:text-gray-500">{i18n(I18nKey.bangumiNoDataDescription)}</p>
    </div>
  {/if}
</div>

