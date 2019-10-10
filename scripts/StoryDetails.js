APP.StoryDetails = (function () {
    var localeData = {
      data: {
        intl: {
          locales: 'en-US'
        }
      }
    };

    var STORY_DETAILS_CONTAINER_ID = "story-detail-container"

    var currentVisibleStoryID = undefined;
    var isOpening = false;
    var tmplStoryDetails = document.getElementById('tmpl-story-details').textContent;
    var tmplformatTimeRelative = ", {{ formatRelative time }}";

    if (typeof HandlebarsIntl !== 'undefined') {
        HandlebarsIntl.registerWith(Handlebars);
    } else {
        // Remove references to formatRelative, because Intl isn't supported.
        var intlRelative = /, {{ formatRelative time }}/;
        tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
        tmplformatTimeRelative = tmplformatTimeRelative.replace(intlRelative, '');
    }
    var storyDetailsTemplate = Handlebars.compile(tmplStoryDetails);
    var formatTimeRelativeTemplate = Handlebars.compile(tmplformatTimeRelative);

    function _createStoryDetailCommentNode(id, comment) {
        var commentNode = document.createElement('aside')
        commentNode.id = "sdc-" + id;
        commentNode.className = 'story-details__comment';
        
        var commentAuthor = document.createElement("p");
        commentAuthor.className = "story-details-comment__author";
        commentAuthor.innerText = comment.by;
        if (comment.time) {
            commentAuthor.innerText += " " + formatTimeRelativeTemplate(comment);
        }
        commentNode.appendChild(commentAuthor);


        var commentText = document.createElement("div");
        commentText.className = "story-details-comment__text";
        commentText.innerHTML = (comment.text);
        commentNode.appendChild(commentText);

        return commentNode;
    }

    function _createLoadingStoryDetailCommentNode() {
        return _createStoryDetailCommentNode("loading", {
            by: '',
            text: 'Loading comment...'
        });
    }

    var _getLoadingCommentsNodes = (function _memoizationWrapper() {
        var memoizationCollection = [null]
        return function (count) {
            if (count > 0) {
                var memoizedValue = memoizationCollection[count];
                if (!memoizedValue) {
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
        var loadingCommentsAnimationFrameID = requestAnimationFrame(function () {
            commentsElement.appendChild(_getLoadingCommentsNodes(3));
            containsLoadingElements = true;
        })
        for (var k = 0; k < commentList.length; k++) {
            // Update the comment with the live data.
            APP.Data.getStoryComment(commentList[k], function (commentDetails) {
                requestAnimationFrame(function () {
                    if (containsLoadingElements) {
                        containsLoadingElements = false;
                        while (commentsElement.children.length !== 1) {
                            commentsElement.removeChild(commentsElement.children[1]);
                        }
                    } else {
                        cancelAnimationFrame(loadingCommentsAnimationFrameID);
                    }
                    commentDetails.time *= 1000;
                    var comment = _createStoryDetailCommentNode(commentDetails.id, commentDetails);
                    commentsElement.appendChild(comment);
                })
            });
        }
    }

    function createStoryDetailsCommentSection () {
        var container = document.createElement("section");
        container.className = "story-details__comments js-comments";
        var title = document.createElement("h2");
        title.className = "story-details__comments-title";
        title.innerText = "Comments";
        container.appendChild(title);
        return container;
    }

    function createTitleLink (url, hostname) {
        link = document.createElement("a");
        link.className = "story-details__title-link";

        link.href = url;
        link.innerText = hostname;

        return link;
    }

    function createContainerDOM(storyDetails) {
        var storyDetailsHtml = storyDetailsTemplate(storyDetails);

        storyDetailContainerDOM = document.createElement('section');
        storyDetailContainerDOM.setAttribute('id', STORY_DETAILS_CONTAINER_ID);
        storyDetailContainerDOM.classList.add('story-details');
        storyDetailContainerDOM.innerHTML = storyDetailsHtml;

        return storyDetailContainerDOM;
    }

    function onStoryClick(storyDetails) {

        // Create and append the story. A visual change...
        // perhaps that should be in a requestAnimationFrame?
        // And maybe, since they're all the same, I don't
        // need to make a new element every single time? I mean,
        // it inflates the DOM and I can only see one at once.
        if (storyDetails) {

            var commentsElement;

            var storyDetailContainerDOM = document.getElementById(STORY_DETAILS_CONTAINER_ID)
            if (!storyDetailContainerDOM) {
                storyDetailContainerDOM = createContainerDOM(storyDetails);

                var closeButton = storyDetailContainerDOM.querySelector('.js-close');
                closeButton.addEventListener('click', hide);

            } else {
                var title = storyDetailContainerDOM.getElementsByClassName("story-details__title")[0];
                title.innerText = storyDetailContainerDOM.title;

                var titleLinkUrl = storyDetails.url;
                var showTitleLink = !!titleLinkUrl;
                var titleLink = title.getElementsByClassName("story-details__title-link")[0];
                if (showTitleLink) {
                    var urlobj = new URL(titleLinkUrl);
        
                    var newTitleLink = createTitleLink(titleLinkUrl, urlobj.hostname);
                    if (titleLink) {
                        titleLink.parentNode.replaceChild(newTitleLink, titleLink);
                    } else {
                        title.appendChild(newTitleLink);
                    }
                } else {
                    if (titleLink) {
                        titleLink.parentNode.removeChild(titleLink);
                    }
                }

                var meta = storyDetailContainerDOM.getElementsByClassName("story-details__meta")[0];
                meta.innerText = "Posted by " + storyDetails.by + formatTimeRelativeTemplate(storyDetails);
            }

            if (storyDetails.kids) {
                var currentCommentSection = storyDetailContainerDOM.getElementsByClassName("story-details__comments")[0];
                if (currentCommentSection) {
                    currentCommentSection.parentNode.appendChild(createStoryDetailsCommentSection())
                    currentCommentSection.parentNode.removeChild(currentCommentSection);
                } else {
                    storyDetailContainerDOM.getElementsByClassName("story-details__content")[0]
                        .appendChild(createStoryDetailsCommentSection())
                }
            } else {
                var commentSection = storyDetailContainerDOM.getElementsByClassName("story-details__comments")[0];
                commentSection.parentNode.removeChild(commentSection);
            }

            var commentList = storyDetails.kids;
            commentsElement = storyDetailContainerDOM.querySelector('.js-comments');
            if (commentList && commentList.length !== 0) {
                loadComments(commentsElement, commentList);
            }

            requestAnimationFrame(function () {
                document.body.appendChild(storyDetailContainerDOM);
                requestAnimationFrame(function(){
                    storyDetailContainerDOM.classList.add("story-details--visible");
                })
            })
        }

    }

    function show(details) {
        if (currentVisibleStoryID !== undefined)
            return;
        currentVisibleStoryID = details.id;
        onStoryClick(details)
    }


    function _hideStory(id) {

        if (currentVisibleStoryID === undefined) {
            return;
        }
        currentVisibleStoryID = undefined;
        var storyDetails = document.getElementById(STORY_DETAILS_CONTAINER_ID);

        storyDetails.classList.remove("story-details--visible");
    }

    function hide() {
        _hideStory(currentVisibleStoryID);
    }

    return {
        show: show,
        hide: hide
    }
})();