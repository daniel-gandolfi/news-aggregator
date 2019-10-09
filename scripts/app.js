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
APP.Main = (function() {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 15;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
      Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
      Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
      Handlebars.compile(tmplStoryDetailsComment);

  var loadingStoryTemplate = storyTemplate({
    title: '...',
    score: '-',
    by: '...',
    time: 0
  });
  var loadingStoryDetailsCommentHtml = storyDetailsCommentTemplate({
    by: '', text: 'Loading comment...'
  });

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData (key, details) {

    // This seems odd. Surely we could just select the story
    // directly rather than looping through all of them.
    var storyId = "s-" + key;

    var story = document.getElementById(storyId);
    var storyCopy = story.cloneNode(false);

    details.time *= 1000;
    var html = storyTemplate(details);
    storyCopy.innerHTML = html;
    storyCopy.addEventListener('click', onStoryClick.bind(this, details));
    storyCopy.classList.add('clickable');

    story.parentNode.replaceChild(storyCopy, story);
    // Tick down. When zero we can batch in the next load.
    storyLoadCount--;

    // Colorize on complete.
    if (storyLoadCount === 0)
      colorizeAndScaleStories();
  }

  function _createStoryDetailCommentNode(id, innerHTML){
    var commentNode = document.createElement('aside')
    commentNode.id = "sdc-" + id;
    commentNode.className = 'story-details__comment';
    commentNode.innerHTML = innerHTML;
    return commentNode;
  }

  function _createLoadingStoryDetailCommentNode(){
    return _createStoryDetailCommentNode("loading", loadingStoryDetailsCommentHtml);
  }

  var _getLoadingCommentsNodes = (function _memoizationWrapper(){
    var memoizationCollection = [null]
    return function(count){
      if (count > 0){
        var memoizedValue = memoizationCollection[count];
        if (!memoizedValue){
          memoizedValue = memoizationCollection[count] = document.createDocumentFragment();
          if (count == 1) {
            memoizedValue.appendChild(_createLoadingStoryDetailCommentNode())
          } else {
            memoizedValue.appendChild(_getLoadingCommentsNodes(count - 1));
            memoizedValue.appendChild(_createLoadingStoryDetailCommentNode());
          }
        }
        return memoizedValue;
      }
    } 
  })()


  function loadComments(commentsElement, commentList) {
    var containsLoadingElements = false;
    var loadingCommentsAnimationFrameID = requestAnimationFrame(function() {
      commentsElement.appendChild(_getLoadingCommentsNodes(3));
      containsLoadingElements = true;
    })
    for (var k = 0; k < commentList.length; k++) {
      // Update the comment with the live data.
      APP.Data.getStoryComment(commentList[k], function(commentDetails) {
        requestAnimationFrame(function(){
          if (containsLoadingElements) {
            containsLoadingElements = false;
            while(commentsElement.children.length !== 1) {
              commentsElement.removeChild(commentsElement.children[1]);
            }
          } else {
            cancelAnimationFrame(loadingCommentsAnimationFrameID);
          }
          commentDetails.time *= 1000;
          var comment = _createStoryDetailCommentNode(commentDetails.id, storyDetailsCommentTemplate(
            commentDetails,
            localeData
          ));
          commentsElement.appendChild(comment);
        })
      });
    }
  }

  function onStoryClick(details) {

    var storyDetails = $('sd-' + details.id);

    // Create and append the story. A visual change...
    // perhaps that should be in a requestAnimationFrame?
    // And maybe, since they're all the same, I don't
    // need to make a new element every single time? I mean,
    // it inflates the DOM and I can only see one at once.
    if (!storyDetails) {

      if (details.url) {
        details.urlobj = new URL(details.url);
      }

      var commentsElement;

      var storyDetailsHtml = storyDetailsTemplate(details);
      var commentList = details.kids;

      storyDetails = document.createElement('section');
      storyDetails.setAttribute('id', 'sd-' + details.id);
      storyDetails.classList.add('story-details');
      storyDetails.innerHTML = storyDetailsHtml;

      commentsElement = storyDetails.querySelector('.js-comments');

      var closeButton = storyDetails.querySelector('.js-close');
      closeButton.addEventListener('click', function(){
        _hideStory(details.id); 
      });


      if (commentList && commentList.length !== 0) {
        loadComments(commentsElement, commentList);
      }

      requestAnimationFrame(function(){
        document.body.appendChild(storyDetails);
        requestAnimationFrame(function(){
          //var headerHeight = storyHeader.getBoundingClientRect().height;
          requestAnimationFrame(showStory.bind(this, details.id));
        })
      })
    }

  }

  function showStory(id) {

    if (inDetails)
      return;

    inDetails = true;

    var storyDetails = $('#sd-' + id);

    if (!storyDetails)
      return;

    storyDetails.classList.add("story-details--visible");
  }


  function _hideStory(id){

    if (!inDetails)
      return;
    inDetails = false; 
    var storyDetails = $('#sd-' + id);

    storyDetails.classList.remove("story-details--visible");
  }

  /**
   * Does this really add anything? Can we do this kind
   * of work in a cheaper way?
   */
  function colorizeAndScaleStories() {

    var storyElements = document.querySelectorAll('.story');
      // It does seem awfully broad to change all the
      // colors every time!
      requestAnimationFrame(function(){
      var height = main.offsetHeight;
      var bodyTop = document.body.getBoundingClientRect().top;
      Array.prototype.map.call(storyElements, function(story){
        var score = story.querySelector('.story__score');
        var title = story.querySelector('.story__title');

        // Base the cale on the y position of the score.
        
        var scoreBounds = score.getBoundingClientRect();
        var scoreLocation = scoreBounds.top - bodyTop;
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
      }).forEach(function(storyComputedData){
        var title = storyComputedData.title;
        var score = storyComputedData.score;
        score.style.transform = "scale(" + storyComputedData.scale + ")";
        score.style.backgroundColor = 'hsl(42, ' + storyComputedData.saturation + '%, 50%)';
        title.style.opacity = storyComputedData.opacity;
      })
    });
  }

  main.addEventListener('scroll', function() {

    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var scrollTopCapped = Math.min(70, main.scrollTop);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

    colorizeAndScaleStories();

    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if (main.scrollTop > 70)
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');

    // Check if we need to load the next batch of stories.
    var loadThreshold = (main.scrollHeight - main.offsetHeight -
        LAZY_LOAD_THRESHOLD);
    if (main.scrollTop > loadThreshold)
      loadStoryBatch();
  });

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
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = loadingStoryTemplate;
      fragment.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }
    main.appendChild(fragment);

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });

})();
