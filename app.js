var redditAPI = (function () {
    const 
	
	REQUEST_ROOT = 'https://www.reddit.com/',

	RESPONSE_FORMAT = 'json',

	VALID_SUBREDDITS = [
		'business',
		'funny'
	],

	VALID_SORTS = [
		'best'
	];
    
	var dataCache = {};
	
    
    function buildRequestURI (path, options) {
		options = options || {};
		
		var requestURI = REQUEST_ROOT + path + '/';
	  
		if (options.sort)
			requestURI += options.sort + '/';
		
		requestURI += '.' + RESPONSE_FORMAT;
        
		return requestURI;
    }
	
	function getData (options) {
		var data = {};
		
		['count','limit','before','after'].map((key) => {
			if (typeof options[key] != 'undefined')
				data[key] = options[key];
		});
		
		return data;
	}
    
    function validateOption (key, val) {
		switch (key) {
			case 'sort':
				return VALID_SORTS.indexOf(val) > -1;
			case 'before':
			case 'after':
				return true;
			case 'limit':
			case 'count':
				return parseInt(val) != NaN;
		}
    }
	
	function validateSubreddit (id) {
		return VALID_SUBREDDITS.indexOf(id) > -1;
	}
      
    function validateOptions (options) {
		for (var key in options) {
			if (!validateOption(key, options[key]))
				return false;
		}
		
		return true;
    }
	
	function request (requestURI, data, unCache) {
		return $.get({
			url: requestURI,
			cache: !unCache,
			data: data,
			dataType: RESPONSE_FORMAT
		}).then(
			(response) => {
				return response;
			},
			(error) => {
				
			}
		);
	}
	
  
    return {
		fetchListing: function (subredditId, options, unCache) {
			if (
				validateSubreddit(subredditId) 
				&& validateOptions(options)
				) {
				return request(buildRequestURI('r/' + subredditId, options), getData(options), unCache);
			}

			
			return $.Deferred().reject("Invalid parameters.");
		}
    };
  })();

var reddit = (function () {

	return {
		config: {
			subreddit: 'business',
			resultsPerPage: 4,
			sorting: 'best' 
		},
		api: redditAPI,
		getBefore: function (count, before) {
			/* HACK: some subreddits return an extra result if no before or after is specified and a limit is specified */
			let limit = before ? reddit.config.resultsPerPage : reddit.config.resultsPerPage - 1;
			
			let options = {
				sort: reddit.config.sorting,
				limit: limit,
				count: count,
				before: before
			};
			
			return redditAPI.fetchListing(
				reddit.config.subreddit, 
				options
			);

			return $.Deferred().reject("Invalid before.");
		},
		getAfter: function (count, after) {
			/* HACK: some subreddits return an extra result if no before or after is specified and a limit is specified */
			let limit = after ? reddit.config.resultsPerPage : reddit.config.resultsPerPage - 1;
				
			let options = {
				sort: reddit.config.sorting,
				limit: limit,
				count: count,
				after: after
			};
			
			return redditAPI.fetchListing(
				reddit.config.subreddit, 
				options
			);

			return $.Deferred().reject("Invalid after.");
		}
	};
})();

var app = function ($) {
	var elements = {
			title: $('#title'),
			list: $('#list'),
			nav: {
				forward: $('#forward'),
				back: $('#back')
			}
		},
		status = {
			count: 0,
			after: null,
			before: null
		};
		
	function setNavStatus () {
		if (status.count > reddit.config.resultsPerPage) {
			elements.nav.back.prop('disabled', "");
		} else {
			elements.nav.back.prop('disabled', true);
		}
	}
	
	function displayResults (results) {
		elements.list.html("");
		
		results.data.children.forEach((child) => {	
			let permalink = 'https://www.reddit.com' + child.data.permalink,
				url = child.data.url ? child.data.url : permalink;
			
			elements.list.append(
				'<li>' +
					'<a target="_blank" class="main-link" href="' + url + '">' +
						child.data.title +
					'</a>' +
					'<div class="info">' +
						'<a target="_blank" href="' + permalink + '">' +
							child.data.num_comments + " comments" +
						'</a>' +
						'<span class="author">' +
							'Submitted by ' + child.data.author +
						'</span>' +
					'</div>' +
				'</li>'
			);
		});
		
		setNavStatus();
	}
	
	function getAfter () {
		reddit.getAfter(status.count, status.after).then((results) => {
			status.after = results.data.after;
			status.before = results.data.before;
			status.count += results.data.children.length;
			displayResults(results);
		});	
	}
	
	function getBefore () {
		if (status.count) {				
			status.count -= reddit.config.resultsPerPage;
			status.count = Math.max(status.count, 0);
			
			reddit.getBefore(status.count, status.before).then((results) => {
				status.after = results.data.after;
				status.before = results.data.before;
				displayResults(results);
			});
		}
	}
	
	elements.nav.forward.on('click', function () {
		getAfter();
	});
	
	elements.nav.back.on('click', function () {	
		getBefore();
	});
	
	elements.title.text('r/'+reddit.config.subreddit);
	
	getAfter();
};

$(function () {
	app($);
})