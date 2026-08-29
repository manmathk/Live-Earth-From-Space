/* V2.1 compatibility bridge: retries the resilient tracker and exposes stable UI status. */
(function(){
  window.ISSDataLink={
    async start(){
      if(!window.ISSTracker) return false;
      const ok=await window.ISSTracker.load();
      return ok && !!window.ISSTracker.sat;
    },
    state(){return {ready:!!(window.ISSTracker&&window.ISSTracker.sat),source:window.ISSTracker?.source||'NONE',age:window.ISSTracker?.fetchedAt?Date.now()-window.ISSTracker.fetchedAt:null}}
  };
})();
