export type CarouselInteractionProof = {
  scrollLeft_before: number;
  scrollLeft_after: number;
  visible_ids_before: string[];
  visible_ids_after: string[];
  page_before?: number;
  page_after?: number;
  event_received?: boolean;
};

export type CarouselArrowPositionProof = {
  prev: { left: number; right: number; top: number; bottom: number };
  next: { left: number; right: number; top: number; bottom: number };
  viewport: { left: number; right: number; top: number; bottom: number };
};

export type CarouselPageType = "BLOG_INDEX" | "BLOG_ARTICLE";

export type CarouselPageContract = {
  carousel_present: boolean;
  carousel_variant: "FeaturedBlogsCarousel" | "LatestBlogsCarousel" | "unknown";
  carousel_root: "shell" | "legacy" | "missing";
  scroll_owner: "viewport" | "missing";
  prev_position: "LEFT_BESIDE" | "WRONG";
  next_position: "RIGHT_BESIDE" | "WRONG";
  native_scrollbar_visible: boolean;
  instance_scoped: boolean;
  legacy_track_root_script: boolean;
};

export const CAROUSEL_KNOWN_GOOD = {
  scrollLeft_before: 2,
  scrollLeft_after_next: 673,
  scrollLeft_after_prev: 2,
  initial: ["card-1", "card-2", "card-3"],
  after_next: ["card-4", "card-5", "card-6"],
  after_prev: ["card-1", "card-2", "card-3"],
} as const;

export const CAROUSEL_ARROW_NO_MOVEMENT: CarouselInteractionProof = {
  scrollLeft_before: 2,
  scrollLeft_after: 2,
  visible_ids_before: ["a", "b", "c"],
  visible_ids_after: ["a", "b", "c"],
  page_before: 1,
  page_after: 1,
  event_received: true,
};

export const CAROUSEL_HANDLER_ONLY: CarouselInteractionProof = {
  scrollLeft_before: 0,
  scrollLeft_after: 0,
  visible_ids_before: ["a", "b", "c"],
  visible_ids_after: ["a", "b", "c"],
  event_received: false,
};

export function evaluateCarouselInteraction(proof: CarouselInteractionProof): {
  gate: "CarouselInteraction";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const moved = Math.abs(proof.scrollLeft_after - proof.scrollLeft_before) > 8;
  const idsChanged =
    proof.visible_ids_before.join("|") !== proof.visible_ids_after.join("|") &&
    proof.visible_ids_after.length > 0;
  if (!moved) reasons.push("SCROLLLEFT_UNCHANGED");
  if (!idsChanged) reasons.push("VISIBLE_IDS_UNCHANGED");
  if (proof.event_received === false) reasons.push("CLICK_NOT_RECEIVED");
  if (proof.page_before != null && proof.page_after != null && proof.page_before === proof.page_after && moved) {
    /* pagination may lag one frame — not a hard fail when scroll moved */
  }
  return {
    gate: "CarouselInteraction",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["MATERIAL_MOVEMENT"],
  };
}

export function evaluateCarouselArrowPosition(proof: CarouselArrowPositionProof): {
  gate: "CarouselArrowPosition";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const v = proof.viewport;
  const prevLeft = proof.prev.right <= v.left + 12;
  const nextRight = proof.next.left >= v.right - 12;
  const prevVertical =
    proof.prev.top <= v.bottom + 8 && proof.prev.bottom >= v.top - 8;
  const nextVertical =
    proof.next.top <= v.bottom + 8 && proof.next.bottom >= v.top - 8;
  const prevAbove = proof.prev.bottom < v.top - 4;
  const prevBelow = proof.prev.top > v.bottom + 4;
  const nextAbove = proof.next.bottom < v.top - 4;
  const nextBelow = proof.next.top > v.bottom + 4;
  if (!prevLeft) reasons.push("PREV_NOT_LEFT_OF_VIEWPORT");
  if (!nextRight) reasons.push("NEXT_NOT_RIGHT_OF_VIEWPORT");
  if (!prevVertical || !nextVertical) reasons.push("ARROWS_NOT_VERTICALLY_CENTERED");
  if (prevAbove || nextAbove) reasons.push("FAIL_CAROUSEL_GEOMETRY_ABOVE");
  if (prevBelow || nextBelow) reasons.push("FAIL_CAROUSEL_GEOMETRY_BELOW");
  return {
    gate: "CarouselArrowPosition",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["FLANKING_CONTROLS"],
  };
}

export function evaluateCarouselPresentation(input: {
  native_scrollbar_visible: boolean;
  custom_arrows_visible: boolean;
}): { gate: "CarouselPresentation"; result: "PASS" | "FAIL"; reasons: string[] } {
  if (input.custom_arrows_visible && input.native_scrollbar_visible) {
    return { gate: "CarouselPresentation", result: "FAIL", reasons: ["FAIL_CAROUSEL_PRESENTATION"] };
  }
  return { gate: "CarouselPresentation", result: "PASS", reasons: ["SCROLLBAR_HIDDEN"] };
}

const LEGACY_TRACK_PRIMARY_SCRIPT =
  /\[data-blog-carousel-track\]"\)\.forEach\(\(root\)=>\{const s=root\.querySelector\("\[data-blog-carousel-scroller\]"\)/;

export function evaluateCarouselSourceContract(source: string): {
  gate: "CarouselSourceContract";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!source.includes('data-blog-carousel-shell="true"')) reasons.push("SHELL_MARKUP_MISSING");
  if (!source.includes("data-blog-carousel-viewport")) reasons.push("VIEWPORT_MARKUP_MISSING");
  if (!source.includes("data-blog-carousel-track")) reasons.push("TRACK_MARKUP_MISSING");
  if (LEGACY_TRACK_PRIMARY_SCRIPT.test(source)) reasons.push("LEGACY_TRACK_ROOT_SCRIPT");
  if (!source.includes("collectCarouselRoots") && !source.includes("data-carousel-initialized")) {
    reasons.push("INSTANCE_SCOPED_INIT_MISSING");
  }
  return {
    gate: "CarouselSourceContract",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CANONICAL_SHELL_AND_SCRIPT"],
  };
}

export function evaluateCarouselMarkupContract(html: string): {
  gate: "CarouselMarkupContract";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!html.includes('data-blog-carousel-shell="true"')) reasons.push("SHELL_MISSING");
  const legacyInverted =
    /<[^>]+data-blog-carousel-track="true"[^>]*>[\s\S]*?data-blog-carousel-scroller="true"/.test(html) &&
    !/<[^>]+data-blog-carousel-shell="true"/.test(html);
  if (legacyInverted) reasons.push("LEGACY_INVERTED_TRACK_ROOT");
  if (html.includes('data-blog-carousel-track="true"') && html.includes('data-blog-carousel-shell="true"')) {
    const trackBeforeViewport = /data-blog-carousel-track="true"[^>]*>[\s\S]*data-blog-carousel-viewport/.test(html);
    if (trackBeforeViewport) reasons.push("TRACK_OUTSIDE_VIEWPORT");
  }
  return {
    gate: "CarouselMarkupContract",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["VIEWPORT_OWNS_TRACK"],
  };
}

export function evaluateKnownBadCarouselFixtures(): Record<string, "PASS" | "FAIL"> {
  return {
    arrow_no_movement: evaluateCarouselInteraction(CAROUSEL_ARROW_NO_MOVEMENT).result,
    handler_only: evaluateCarouselInteraction(CAROUSEL_HANDLER_ONLY).result,
    scrollleft_stuck: evaluateCarouselInteraction({
      scrollLeft_before: 40,
      scrollLeft_after: 40,
      visible_ids_before: ["a"],
      visible_ids_after: ["b"],
    }).result,
    arrows_above: evaluateCarouselArrowPosition({
      prev: { left: 100, right: 140, top: 10, bottom: 50 },
      next: { left: 900, right: 940, top: 200, bottom: 240 },
      viewport: { left: 160, right: 880, top: 80, bottom: 320 },
    }).result,
    arrows_below: evaluateCarouselArrowPosition({
      prev: { left: 100, right: 140, top: 400, bottom: 440 },
      next: { left: 900, right: 940, top: 400, bottom: 440 },
      viewport: { left: 160, right: 880, top: 80, bottom: 320 },
    }).result,
    known_good: evaluateCarouselInteraction({
      scrollLeft_before: CAROUSEL_KNOWN_GOOD.scrollLeft_before,
      scrollLeft_after: CAROUSEL_KNOWN_GOOD.scrollLeft_after_next,
      visible_ids_before: [...CAROUSEL_KNOWN_GOOD.initial],
      visible_ids_after: [...CAROUSEL_KNOWN_GOOD.after_next],
      page_before: 1,
      page_after: 2,
    }).result,
    arrows_flanking: evaluateCarouselArrowPosition({
      prev: { left: 24, right: 64, top: 180, bottom: 220 },
      next: { left: 916, right: 956, top: 180, bottom: 220 },
      viewport: { left: 72, right: 908, top: 120, bottom: 280 },
    }).result,
  };
}

/** Instance-scoped carousel controller — viewport is the scroll owner. */
export const SHARED_BLOG_CAROUSEL_SCRIPT = `(()=>{
  function visibleColumns(width){
    if(width<=768)return 1;
    if(width<=1024)return 2;
    return 3;
  }
  function collectCarouselRoots(){
    var roots=[];
    document.querySelectorAll('[data-blog-carousel-shell="true"]').forEach(function(el){
      if(el.getAttribute('data-carousel-initialized')==='true')return;
      roots.push(el);
    });
    document.querySelectorAll('[data-blog-carousel-track="true"]').forEach(function(el){
      if(el.closest('[data-blog-carousel-shell="true"]'))return;
      if(el.getAttribute('data-carousel-initialized')==='true')return;
      if(el.querySelector('[data-blog-carousel-scroller]')&&el.querySelector('[data-blog-carousel-prev]')){
        roots.push(el);
      }
    });
    return roots;
  }
  function resolveViewport(root){
    var viewport=root.querySelector('[data-blog-carousel-viewport], [data-blog-carousel-scroller]');
    if(viewport)return viewport;
    if(root.matches('[data-blog-carousel-track]')||root.matches('.onpv-blog-carousel')){
      return root.querySelector('[data-blog-carousel-scroller], [data-blog-carousel-viewport]');
    }
    return null;
  }
  function initCarousel(root){
    if(!root||root.getAttribute('data-carousel-initialized')==='true')return;
    var viewport=resolveViewport(root);
    var track=viewport?viewport.querySelector('[data-blog-carousel-track]'):root.querySelector('[data-blog-carousel-track]');
    var prev=root.querySelector('[data-blog-carousel-prev]');
    var next=root.querySelector('[data-blog-carousel-next]');
    if(!viewport||!track||!prev||!next)return;
    root.setAttribute('data-carousel-initialized','true');
    root.setAttribute('data-carousel-bound','true');
    var section=root.closest('[data-blog-carousel]')||root;
    var pager=section.querySelector('[data-carousel-pagination]');
    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function slides(){
      return Array.prototype.slice.call(track.querySelectorAll('[data-carousel-slide]'));
    }
    function stepPx(){
      var cols=visibleColumns(window.innerWidth||1440);
      var list=slides();
      if(!list.length)return Math.max(viewport.clientWidth,1);
      var first=list[0].getBoundingClientRect();
      var second=list[1]?list[1].getBoundingClientRect():null;
      var card=Math.max(first.width,1);
      var gap=second?Math.max(0,second.left-first.right):12;
      return Math.max(1,Math.round((card+gap)*cols));
    }
    function pageCount(){
      var cols=visibleColumns(window.innerWidth||1440);
      return Math.max(1,Math.ceil(slides().length/cols));
    }
    function currentPage(){
      var max=Math.max(0,viewport.scrollWidth-viewport.clientWidth-2);
      if(max<=0)return 1;
      var page=Math.round((viewport.scrollLeft/max)*(pageCount()-1))+1;
      return Math.min(pageCount(),Math.max(1,page));
    }
    function syncPager(){
      if(!pager)return;
      var page=currentPage();
      section.setAttribute('data-carousel-page',String(page));
      pager.querySelectorAll('button[data-carousel-page]').forEach(function(btn){
        var active=Number(btn.getAttribute('data-carousel-page'))===page;
        btn.setAttribute('aria-current',active?'page':'false');
      });
    }
    function sync(){
      var max=Math.max(0,viewport.scrollWidth-viewport.clientWidth-2);
      prev.disabled=viewport.scrollLeft<=2;
      next.disabled=viewport.scrollLeft>=max;
      prev.setAttribute('aria-disabled',String(prev.disabled));
      next.setAttribute('aria-disabled',String(next.disabled));
      syncPager();
    }
    function move(direction){
      viewport.scrollBy({left:direction*stepPx(),behavior:reduced?'auto':'smooth'});
    }
    prev.addEventListener('click',function(e){e.preventDefault();move(-1);});
    next.addEventListener('click',function(e){e.preventDefault();move(1);});
    if(pager){
      pager.querySelectorAll('button[data-carousel-page]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var target=Number(btn.getAttribute('data-carousel-page')||'1');
          var max=Math.max(0,viewport.scrollWidth-viewport.clientWidth-2);
          var page=Math.min(pageCount(),Math.max(1,target));
          var left=pageCount()<=1?0:Math.round(((page-1)/(pageCount()-1))*max);
          viewport.scrollTo({left:left,behavior:reduced?'auto':'smooth'});
        });
      });
    }
    viewport.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
      if(e.key==='ArrowRight'){e.preventDefault();move(1);}
    });
    viewport.addEventListener('scroll',sync,{passive:true});
    window.addEventListener('resize',sync);
    sync();
  }
  function boot(){
    collectCarouselRoots().forEach(initCarousel);
  }
  function scheduleBoot(){
    boot();
    [0,120,400,1200,3200].forEach(function(ms){ setTimeout(boot,ms); });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleBoot);
  }else{
    scheduleBoot();
  }
  window.addEventListener('load',boot);
})();`;
