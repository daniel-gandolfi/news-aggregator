APP.featureDetection = (function(){
    var supportsPassiveListeners = (function(){
        var supportsPassive = false;
        var opts = Object.defineProperty({}, 'passive', {
            get: function() {
                supportsPassive = true;
            }
        });
        window.addEventListener("testPassive", null, opts);
        window.removeEventListener("testPassive", null, opts);
        return function() {
            return supportsPassive
        };
    })();
    return {
        supportsPassiveListeners: supportsPassiveListeners
    }
})();