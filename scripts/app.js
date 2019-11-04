/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function () {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 15;
  var main = $('main');
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };
  var visibleStoryElements = [];

  var tmplStory = $('#tmpl-story').textContent;
  var tmplformatTimeRelative;
  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
    tmplformatTimeRelative = ", {{ formatRelative time }}";

  } else {
    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplformatTimeRelative = ", {{ formatRelative time }}";
  }

  var formatTimeRelative =
    Handlebars.compile(tmplformatTimeRelative);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData(key, details) {

    // This seems odd. Surely we could just select the story
    // directly rather than looping through all of them.
    details.time *= 1000;
    var storyNode = createStoryNode(
      details.title,
      details.score,
      details.by,
      formatTimeRelative(details)
    );
    var storyId = storyNode.id = "s-" + key;

    var loadingStoryNode = document.getElementById(storyId);

    storyNode.addEventListener('click', onStoryClick.bind(this, details));

    loadingStoryNode.parentNode.replaceChild(storyNode, loadingStoryNode);
    // Tick down. When zero we can batch in the next load.
    storyLoadCount--;

    // Colorize on complete.
    if (storyLoadCount === 0)
      colorizeAndScaleStories();
  }

  var onStoryClick = APP.StoryDetails.show;

  function _onElementEnterView(el) {
    if (visibleStoryElements.indexOf(el) === -1) {
      visibleStoryElements.push(el)
    }
  }
  function _onElementExitView(el) {
    var index = visibleStoryElements.indexOf(el);
    if (index !== -1) {
      visibleStoryElements.splice(index, 1);
    }
  }
  var observer = new IntersectionObserver(function (intersectionObserverEntryList) {
    intersectionObserverEntryList.forEach(function (intersectionObserverEntry) {
      var isVisible = intersectionObserverEntry.isIntersecting;
      if (isVisible) {
        _onElementEnterView(intersectionObserverEntry.target);
      } else {
        _onElementExitView(intersectionObserverEntry.target);
      }
    })
  }, {
    threshold: [.01, 1]
  });
  function mutationObserver(mutationRecordList) {
    mutationRecordList.forEach(function (mutationRecord) {
      mutationRecord.removedNodes.forEach(_onElementExitView)
      mutationRecord.addedNodes.forEach(observer.observe.bind(observer))
    })
  }

  var scrollListeners = [];

  function colorizeAndScaleStories(currentScroll, totalHeight, elementHeight) {
    var height = elementHeight;
    var bodyTop = 0;
    Array.prototype.map.call(visibleStoryElements, function (story) {
      var score = story.querySelector('.story__score');
      var title = story.querySelector('.story__title');

      // Base the cale on the y position of the score.

      var scoreBounds = score.getBoundingClientRect();
      var scoreLocation = scoreBounds.top - 0;
      var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
      var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / height)));

      var diameter = scale * 40;

      // Now figure out how wide it is and use that to saturate it.
      var saturation = (100 * ((diameter - 38) / 2));

      return {
        story,
        score,
        title,
        diameter,
        saturation,
        opacity
      }
    }).forEach(function (storyComputedData) {
      var title = storyComputedData.title;
      var score = storyComputedData.score;
      score.style.transform = "scale(" + storyComputedData.scale + ")";
      //TODO: convert in filter as backgroundColor triggers layout
      score.style.backgroundColor = 'hsl(42, ' + storyComputedData.saturation + '%, 50%)';
      title.style.opacity = storyComputedData.opacity;
    })
  }

  var headerListener = (function(){
    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var lastScrollTop;
    var capScroll = function (scrollTop) {
      return Math.min(70, scrollTop);
    };
    return function (currentScroll, totalHeight, elementHeight) {
      var scrollTop = currentScroll;
      var scrollHeight = totalHeight;
      var mainOffsetHeight = elementHeight;
      var scrollTopCapped = capScroll(scrollTop);

      var scrollCappedChanged = !lastScrollTop || capScroll(lastScrollTop) !== scrollTopCapped;
      if (scrollCappedChanged) {
        header.style.height = (156 - scrollTopCapped) + 'px';
        var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';
        headerTitles.style.webkitTransform = scaleString;
        headerTitles.style.transform = scaleString;
      }
      if (lastScrollTop <= 70 && scrollTop > 70 ||
        lastScrollTop > 70 && scrollTop <= 70) {
        // Add a shadow to the header.
        if (scrollTop > 70)
          document.body.classList.add('raised');
        else
          document.body.classList.remove('raised');
      }
      // Check if we need to load the next batch of stories.
      var loadThreshold = (scrollHeight - mainOffsetHeight - LAZY_LOAD_THRESHOLD);
      if (scrollTop > loadThreshold) {
        loadStoryBatch();
      }

      lastScrollTop = scrollTop;
    };
  })();

  var lastScrollAnimationFrameId;
  main.addEventListener('scroll', (function () {
    cancelAnimationFrame(lastScrollAnimationFrameId);
    lastScrollAnimationFrameId = requestAnimationFrame(function () {
			cancelAnimationFrame(lastScrollAnimationFrameId);
      var currentScroll = main.scrollTop;
      var totalHeight = main.scrollHeight;
      var elementHeight = main.offsetHeight;
      scrollListeners.forEach(function (listener) {
        listener(currentScroll, totalHeight, elementHeight);
      });
    });
  }), APP.featureDetection.supportsPassiveListeners() ? { passive: true } : null);

  scrollListeners.push(colorizeAndScaleStories);
	scrollListeners.push(headerListener);

  var createStoryNode = (function () {
    var originalStoryNode = document.createElement('div');
    originalStoryNode.classList.add('story');
    originalStoryNode.innerHTML = Handlebars.compile(tmplStory)({
      title: '',
      score: '',
      by: '',
      time: 0
    });

    return function (title, score, by, relativeTimeFormatted) {

      originalStoryNode
        .getElementsByClassName("story__title")[0]
        .innerText = title;
      originalStoryNode
        .getElementsByClassName("story__score")[0]
        .innerText = score;
      originalStoryNode
        .getElementsByClassName("story__by")[0]
        .innerText = "Posted by " + by + relativeTimeFormatted;

      return originalStoryNode.cloneNode(true);
    }
  })();

  var createLoadingStoryNode = (function() {
    var originalLoadingNode = createStoryNode(
      "...",
      "-",
      "...",
      formatTimeRelative({time:0})
    );

    return (function _createLoadingStoryNode(key) {
      var storyNode = originalLoadingNode.cloneNode(true);
      storyNode.id = "s-" + key;
      return storyNode;
    });
  })();

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;

    var end = storyStart + count;
    var fragment = document.createDocumentFragment();
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      fragment.appendChild(createLoadingStoryNode(key));

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }
    main.appendChild(fragment);

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function (data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
    visibleStoryElements = [];
    new MutationObserver(mutationObserver).observe(main, { childList: true })
  });

})();
