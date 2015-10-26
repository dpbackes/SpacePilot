var PhoneFrame = function()
{
	// Override this in custom frames:
	this.frameType = "Phone";
	this.isPhone = true;
	this.navBarWidth = 62;
	this.navExpandedWidth = 200;
	this.navTimeouts = [];
	this.tabCount = 0;
	this.menuTabs = [];
	this.currentLayout = PhoneFrame.LAYOUT_LANDSCAPE;
	this.viewingSlideID = null;

	this.tabTitles = { "glossary": "Glossary", "transcript": "Slide Notes"};

	if (!player.isSmallDevice)
	{
		this.navBarWidth = 75;
	}
	this.visibleNavBarWidth = this.navBarWidth;

	player.forceMenu = true;
};
PhoneFrame.prototype = new DefaultFrame();

PhoneFrame.LAYOUT_LANDSCAPE = 0;
PhoneFrame.LAYOUT_PORTRAIT_NARROW = 1;
PhoneFrame.LAYOUT_PORTRAIT_WIDE = 2;
PhoneFrame.LAYOUT_PORTRAIT_SINGLE = 3;

PhoneFrame.react = function(color)
{
	$("#player").css("background-color", color);
	setTimeout(function()
	{
		$("#player").css("background-color", "#000");
	}, 400);
};

player.isSmallDevice = (window.innerWidth <= 480 || window.innerHeight <= 480);

PhoneFrame.prototype.createFrame = function(xml, width, height, fitToContainer)
{
	//this.ref = $("<style>*{border: initial;border-radius: 0;}body{background: #000 !important;overflow: hidden;}#framewrap{width: 100%;height: 100%;border:none!important;border-radius: initial;background: #000 !important;}#slidecontainer{overflow: visible;}.block-button{position: absolute;width: 10%;height: 100%;top: 0px;left: 90%;}.block-button.left{left: 0px;}.nav-bar{position:absolute;height:50px;width:100%;background:rgba(0,0,0,0.8);bottom:-51px;transition:bottom;transition-duration:100ms;transition-timing-function: ease-in;border-top:solid 1px #555;z-index:20000;}.nav-button{height:50px;float:left;clear:none;width:50px;}#progressbar{float:left;clear:none;border:none;border-radius:0;-webkit-border-radius:0;-moz-border-radius:0;height:20px;margin:15px 0px;background:rgba(0,0,0,0.8)!important;}.progress-bar{border:none;border-radius:0;-webkit-border-radius:0;-moz-border-radius:0;height:20px;}.entity-icon{color:#fff;cursor:pointer;font-size:30px;margin:8px 10px;}.play{margin:8px 10px;}.pause2{font-size:18px;margin:14px 10px;}</style><div id='framewrap'><div id='slidecontainer'></div></div><div class='block-button right control-next'></div><div class='block-button right control-submit'></div><div class='block-button right control-submitall'></div><div class='block-button right control-finish'></div><div class='block-button left control-previous'></div><div class='nav-bar'><div class='control-pauseplay ignore nav-button'><div class='entity-icon play'>►</div><div class='entity-icon pause'>❚❚</div></div><div id='progressbar' class='progress-container'><div class='progress-bar'></div></div></div>");
	if (!Frame.templateData)
	{
		console.error("Cannot view Phone Frame from the local filesystem");
		return;
	}
	this.ref = $(Frame.templateData).children();

	this.container = $("#player");
	this.container.empty();

	this.container.append(this.ref);


	this.bindNav();
	DefaultFrame.prototype.createFrame.call(this, xml, width, height, fitToContainer);

	if (player.isIOS)
	{
		player.isIOS7 = navigator.appVersion.indexOf("OS 7") > -1;
		player.isIOSWithoutMinimal = !player.isIOS7;
		if (player.isIOS7)
		{
			// iOS7 supports minimal-ui.  Tapping the top brings down the browser nav.  Tapping the content dismisses browser nav.
			// Bottom ~20px is non-responsive to user clicks (as it would normally bring in the nav were it not for minimal-ui).
			// The responsive player handles this nicely by sticking the nav off to the side, though we'll need to bump the lowest button up a bit to ensure it's responsive to clicks.
			// Tapping the top 20px brings back the nav, so we'll also want to bump the top button down a bit so that clicking it doesn't also drop down the nav.
			$("#player").addClass("minimal-ui-fix");
		}
		else
		{

			$(window).bind("gesturestart", function(e)
			{
				e.originalEvent.preventDefault();
			});


			// iOS8 removed minimal-ui.  Tapping top or bottom brings down browser nav.  Browser nav cannot be dismised except by scrolling the page.
			// No event is fired when browser nav appears.
			setInterval(Frame.current.showIOSFullScreenMessageIfNecessary, 1000);

			// Tapping the bottom 20px of the screen drops us out of fullscreen mode and shows the nav.  This will pull the last button up out of harm's way.
			$("#player").addClass("non-minimal-ui-fix");
		}

		$(window).bind('scroll', function(event)
		{
			if (window.scrollY != 0)
			{
				window.scrollTo(0, 0);
			}

			return false;
		});

	}

	if (this.readOnlySeekbar)
	{
		this.progressBar.handleThickness = 0;
		this.progressBar.handleRadius = 0;
	}

	if (Frame.current.options.levelbehavior == Frame.LEVEL_BEHAVIOR_MANUAL)
	{
		Frame.current.options.levelbehavior = Frame.LEVEL_BEHAVIOR_INSIDE;
	}

	this.bindGestureEvents();
	this.initPinchZoomPan();
	this.progressBar.initProgressRing();
	Frame.startOrientationWatcher();
};

PhoneFrame.prototype.setSlide = function(slidePack, windowRef)
{
	this.viewingSlideID = slidePack.slideid;
	if (slidePack.slideid.indexOf("ResumePromptSlide") > -1)
	{
		this.showResumePrompt();
		Frame.current.windows[windowRef].hide();
		WindowComponent.externalContainer.show();
		return;
	}

	pinch.reset();

	this.updatePresenter(slidePack.presenterref, slidePack.presentervideourl);

	DefaultFrame.prototype.setSlide.call(this, slidePack, windowRef);
};

PhoneFrame.prototype.setSlideExit = function(slide, windowRef)
{
	this.viewingSlideID = null;
};

PhoneFrame.prototype.showResumePrompt = function()
{
	var prompt = new WindowComponent();
	prompt.linkid = "StoryPopup";
	prompt.width = prompt.originalWidth = 720;
	prompt.height = prompt.originalHeight = 90;
	prompt.isPrompt = false;
	prompt.isLightbox = true;
	prompt.hasControls = false;

	prompt.applySize = function()
	{
		var rightPad = Frame.current.navBarWidth;
		var bottomPad = 0;
		if (FrameKit.isPortrait())
		{
			rightPad = 0;
			bottomPad = Frame.current.navBarWidth;
		}

		var scale = Math.min((window.innerWidth - rightPad) / this.width, 1);
		var left = (window.innerWidth - rightPad - this.width * scale) / 2 / scale;
		var top = (window.innerHeight - bottomPad - this.height * scale) / 2 / scale;

		// Stack the buttons on small devices
		var minScale = 0.7;
		if (scale < minScale)
		{
			scale = minScale;
			left = (window.innerWidth - rightPad - 350 * scale) / 2 / scale;	// 250 width + 20*2 padding + 30*2 margin
			top = (window.innerHeight - bottomPad - 180 * scale) / 2 / scale;	// (60 height + 10*2 padding) * 2 + 20 margin
		}

		this.contentRef.css("zoom", scale);
		this.contentRef.css("left", left);
		this.contentRef.css("top", top);

		var titlePad = Math.floor(window.innerWidth * 0.1);
		this.titleRef.css("width", window.innerWidth - rightPad - titlePad * 2);
		this.titleRef.css("padding-left", titlePad);
	};

	prompt.show();

	prompt.ref.removeClass("window");
	prompt.ref.addClass("resumeprompt");

	prompt.ref.empty();
	var spanTitle = $('<span class="content_title"></span>');
	var divContent = $('<div class="lightbox_resume_content"></div>');
	var btnRestart = $("<a class='resumebutton'>Restart</a>");
	var btnContinue = $("<a class='resumebutton'>Continue</a>");
	prompt.ref.append(spanTitle);
	divContent.append(btnRestart);
	divContent.append(btnContinue);
	prompt.ref.append(divContent);
	prompt.contentRef = divContent;
	prompt.titleRef = spanTitle;

	this.updateLaunchTitle();

	var clickButton = function(buttonIndex)
	{
		var index = 0;
		for (var key in player.currentSlide().children)
		{
			var button = player.currentSlide().children[key];
			if (button.innerType == "button" && index++ == buttonIndex)
			{
				$(".entity-icon").removeClass("disabled");
				button.handleEvent("onrelease", null, null, false, false, true);
				return;
			}
		}
	};

	var trigger = player.isDesktop ? "mousedown" : "touchstart";
	if (player.isIOS && !player.isIOSlt9)
	{
		// iOS9 stopped allowing touchstart to play media.  We prep media off of these buttons.
		trigger = "touchend";
	}

	btnContinue.bind(trigger, function()
	{
		clickButton(0);
		prompt.hide();
	});

	btnRestart.bind(trigger, function()
	{
		clickButton(1);
		prompt.hide();
	});

	$(".entity-icon").addClass("disabled");

	this.resumePrompt = prompt;
	this.initOrientation();
};


PhoneFrame.prototype.addTopTab = function(group, title, content, name, ignoreSlideLock)
{
	var me = this;
	this.tabCount++;
	this.lastTabTitle = title;

	// top bar must not be hidden if we're adding tabs to it...
	me.top_bar_hidden = false;
	me.cant_hide_topbar = true;

	var tab;
	if (name == "customlink")
	{
		tab = me.buildTopLink(group, title, content, name, ignoreSlideLock);
	}
	else
	{
		tab = me.buildTopTab(group, title, content, name, ignoreSlideLock);
	}

	switch (group)
	{
		case "sidebar":
			var topLinks = $("#tab_list").children(".linkleft,.linkright");
			if (topLinks.length > 0)
			{
				tab.insertBefore(topLinks.first());
			}
			else
			{
				$("#tab_list").append(tab);
			}
			break;

		case "linkleft":
			var rightLinks = $("#tab_list").children(".linkright");
			if (rightLinks.length > 0)
			{
				tab.insertBefore(rightLinks.first());
			}
			else
			{
				$("#tab_list").append(tab);
			}
			break;

		case "linkright":
			$("#tab_list").append(tab);
			break;

		case "presenter":
			$("#tab_list").prepend(tab);
			break;
	}

	this.menuTabs.push(name);

	return tab;
};
PhoneFrame.prototype.addSideTab = PhoneFrame.prototype.addTopTab;

PhoneFrame.prototype.buildTopTab = function(group, title, content, name, ignoreSlideLock)
{
	var me = this;
	var tab = $('<div class="toptab tab ' + name + ' ' + group + '"><span class="label ' + name + '">' + title + '</span></div>');

	var tabContent = $('<div class="menu_container "' + name + '></div>');
	tabContent.append(content);
	me.navContent.append(tabContent);


	var clickEvent = player.isMobile ? "touchend" : "click";
	var link = tab.children("span").first();
	var downY = -1;
	link.bind(clickEvent, function(event)
	{
		if (downY > 0 && Math.abs(downY - swipe.y) > 20)
		{
			return false;
		}

		if (!tab.hasClass("active"))
		{
			MouseEvents.processHideables(event);

			$(".active").removeClass("active");
			tab.addClass("active");
			tabContent.addClass("active");
			if (!me.registeredTopBar)
			{
				MouseEvents.addHideable(null, ".menu_container,.nav-expanded,.nav-bar", function()
				{
					if (me.navExpandedVisible)
					{
						me.hideNav();
					}
				});
				me.registeredTopBar = true;
			}

			me.setTabTitle(name);

			if (me.currentLayout == PhoneFrame.LAYOUT_PORTRAIT_SINGLE)
			{
				me.hideNav();
				return false;
			}
		}

		me.interstitial.hide();
		if (name == "presenter" && me.currentLayout == PhoneFrame.LAYOUT_LANDSCAPE)
		{
			$(".toptab.active").removeClass("active");
			me.navContainer[0].className = "navcontainer " + name;
			me.navContainer.show();
			me.navExpanded.css("right", "-138px");
			me.navExpanded.hide();
			me.navExpandedVisible = false;
		}
		else if (me.navContainer && me.currentLayout != PhoneFrame.LAYOUT_LANDSCAPE)
		{
			$(".toptab.active").removeClass("active");
			me.navContainer[0].className = "navcontainer " + name;
			me.navContainer.show();
			me.navTimeouts.push(setTimeout(function()
			{
				me.navContainer.css("opacity", 1);
			}, 10));


			if (me.currentLayout == PhoneFrame.LAYOUT_PORTRAIT_NARROW)
			{
				me.navExpandedLowered = true;
				me.navExpanded.addClass("lowered");
				me.navExpanded.css("bottom", "-200px");
				me.navExpandedButtonGlyph.attr("xlink:href", "#svg_menu");
				setTimeout(function()
				{
					me.navExpanded.scrollTop(0);
				}, 200);
			}
			else
			{
				me.navExpanded.css("opacity", 0);
				me.popoutArrow.css("opacity", 0);
				me.navExpanded.hide();
				me.popoutArrow.hide();
			}
		}

		return false;
	});

	link.bind("touchstart", function(event)
	{
		swipe.parseEventCoords(event);
		downY = swipe.y;
	});

	return tab;
};

PhoneFrame.prototype.buildTopLink = function(group, title, data, name, ignoreSlideLock)
{
	var tab = $('<div class="toptab customlink ' + group + '"><span class="label ' + name + '">' + title + '</span></div>');

	if (ignoreSlideLock)
	{
		tab.addClass("ignorelocked");
	}

	var link = tab.children("span").first();
	link.bind("click", function(event)
	{
		if (!tab.hasClass("locked") || ignoreSlideLock)
		{
			story.handleEvent("onobjectevent", data, null, false, false, true);
		}
		return false;
	});

	return tab;
};

PhoneFrame.prototype.setTabTitle = function(name)
{
	var title = this.tabTitles[name] || story.title;
	$("#storytitle_section").text(title);
};

PhoneFrame.prototype.updateTextLabels = function()
{
	DefaultFrame.prototype.updateTextLabels.call(this);

	for (var key in this.tabTitles)
	{
		if (this.tabTitles.hasOwnProperty(key))
		{
			this.tabTitles[key] = this.getTextLabel(key);
		}
	}
};

PhoneFrame.prototype.showIOSFullScreenMessageIfNecessary = function()
{
	// TODO: use know dimensions, known aspect ratio, or other method to generate these numbers rather than hardcoding for iPhone5
	// small: 568x232
	// large: 568x320

	// iPhone 4, 5: 232 w/ nav, 320 without
	// iPhone 6: 331 w/nav, 375 without
	// iPhone 6plus: 337 w/ nav, 414 without, 389 with compact tabs

	if (!player.isIOSWithoutMinimal)
	{
		return;
	}

	var showScrollInstructions = function()
	{
		if (!player.scrollInstructions)
		{
			$(document.body).append($("<div class='scroll-embiggener'></div>"));
			$(".nav-bar>.nav-end-container").append($("<div class='scroll-embiggener'></div>"));
			player.scrollInstructions = $(".scroll-embiggener");
		}
		player.scrollInstructions.show();
		player.scrollInstructionsVisible = true;
	};

	if (player.iosDebug)
	{
		if (!player.baseMessage)
		{
			player.baseMessage = $("<div class='base-message'></div>");
			$(document.body).append(player.baseMessage);
		}
		player.baseMessage.text(window.innerHeight);
	}

	player.allowTouchScroll = (window.innerHeight == 232 || window.innerHeight == 337 || window.innerHeight == 331 || window.innerHeight == 389);
	if (player.allowTouchScroll && (!player.launch || player.launch.is(':hidden')))
	{
		showScrollInstructions();
	}
	else if (player.scrollInstructions && player.scrollInstructionsVisible)
	{
		player.scrollInstructionsVisible = false;
		player.scrollInstructions.hide();
		Frame.current.updateFrame(true);
	}
};

PhoneFrame.prototype.bindGestureEvents = function()
{
	var me = this;

	this.prepSwipeNav();

	window.addEventListener('orientationchange', function()
	{
		Frame.current.initOrientation();
		Frame.current.updateFrame();
		me.raiseBoundsChanged();
	});

	// Fix for http://youtrack.articulate.com/issue/SL3-401 (double tap triggers OS zoom on iOS7 devices)
	if (player.isIOS7)
	{
		var lastClick = new Date();
		window.addEventListener('touchstart', function(e)
		{
			var now = new Date();
			var doubleClick = (e.touches.length == 1 && now - lastClick < 500);
			lastClick = now;
			if (doubleClick)
			{
				e.preventDefault();
				return false;
			}
		});
	}
};

PhoneFrame.prototype.bindNav = function()
{
	var me = this;
	me.navBar = $(".nav-bar");
	me.navExpanded = $(".nav-expanded");
	me.navContainer = $(".navcontainer");
	me.navContent = $(".navcontent");
	me.popoutArrow = $(".popout-arrow");
	me.timerSection = $(".timer-section");
	me.interstitial = $(".interstitial");
	me.interstitial.removeClass("resume black white");
	me.navExpandedButtonGlyph = $(".nav-expanded>.entity-icon.control-menu use");
	me.navExpandedVisible = false;
	var clickEvent = player.isMobile ? "touchend" : "click";
	$(".control-menu").bind(clickEvent, function()
	{
		if ($(this).hasClass("disabled"))
		{
			return;
		}

		me.clearNavTimeouts();
		if (me.navExpandedVisible && !me.navExpandedLowered)
		{
			me.hideNav();
		}
		else
		{
			me.showNav();
		}
	});

	$(".navcontainer-close").bind(clickEvent, function()
	{
		me.clearNavTimeouts();
		me.hideNav();
	});
};

PhoneFrame.prototype.clearNavTimeouts = function () {
	for (var i = 0; i < this.navTimeouts.length; i++) {
		clearTimeout(this.navTimeouts[i]);
	}
	this.navTimeouts = [];
};

PhoneFrame.prototype.showNav = function()
{
	var me = this;
	me.navExpandedButtonGlyph.attr("xlink:href", "#svg_close");
	this.navExpanded.removeClass("lowered");
	switch (this.currentLayout)
	{
		case PhoneFrame.LAYOUT_LANDSCAPE:

			this.navExpanded.show();
			this.navExpandedVisible = true;
			me.navContainer.show();

			me.navBar.css("opacity", 0);
			me.navExpanded.css("opacity", 1);
			this.navTimeouts.push(setTimeout(function ()
			{
				me.navExpanded.css("right", "0px");
				me.navContainer.css("opacity", 1);
			}, 100));
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_NARROW:

			this.navExpanded.show();
			this.interstitial.show();
			this.navExpandedVisible = true;
			this.navExpandedLowered = false;
			me.navExpandedButtonGlyph.attr("xlink:href", "#svg_menu");
			$(".active").removeClass("active");

			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.css("opacity", 1);
			}, 0));
			
			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.css("bottom", "0%");
			}, 100));
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_WIDE:

			this.navExpanded.show();
			this.popoutArrow.show();
			this.interstitial.show();
			$(".active").removeClass("active");

			this.navExpandedVisible = true;

			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.css("opacity", 1);
				me.popoutArrow.css("opacity", 1);
			}, 10));
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_SINGLE:
			this.navExpandedVisible = true;
			me.navContainer.show();
			this.navTimeouts.push(setTimeout(function()
			{
				me.navContainer.css("opacity", 1);
			}, 100));
			break;
	}

	this.resizeNavContainer();
};

PhoneFrame.prototype.hideNav = function()
{
	var me = this;

	this.interstitial.hide();
	this.navExpanded.removeClass("lowered");
	switch (this.currentLayout)
	{
		case PhoneFrame.LAYOUT_LANDSCAPE:
			this.navExpanded.css("right", "-138px");
			this.navExpandedVisible = false;
			me.navContainer.css("opacity", 0);

			this.navTimeouts.push(setTimeout(function()
			{
				me.navBar.css("opacity", 1);
			}, 200));

			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.hide();
				me.navContainer.hide();
				me.activateFirstTablistItem();
			}, 600));
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_NARROW:
			var fadeStartDelay = this.navExpandedLowered ? 0 : 100;
			this.navExpanded.css("bottom", "-200px");
			this.navExpandedVisible = false;
			this.navExpandedLowered = false;
			me.navContainer.hide();

			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.css("opacity", 0);
			}, fadeStartDelay));

			this.navTimeouts.push(setTimeout(function()
			{
				me.navExpanded.hide();
			}, fadeStartDelay + 400));
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_WIDE:
			this.navExpandedVisible = false;
			this.navExpanded.hide().css("opacity", 0);
			this.popoutArrow.hide().css("opacity", 0);
			this.navContainer.hide().css("opacity", 0);
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_SINGLE:
			this.navExpandedVisible = false;
			this.navContainer.hide().css("opacity", 0);
			break;
	}
};

PhoneFrame.prototype.isLightboxShowing = function()
{
	return this.currentWindow && !this.currentWindow.isPrompt;
};

PhoneFrame.prototype.prepSwipeNav = function()
{
	var me = this;

	var animateReturn = function(ref)
	{
		if (!me.canSwipeNavigate())
		{
			return;
		}

		ref = ref || $(".slide.in");
		var steps = 10;
		var x = (swipe.x - swipe.downX);
		var initialSide = x > 0;
		var vx = -x/20;

		var step = function()
		{
			x = parseInt(x + vx);
			vx *= 1.3;
			var side = x > 0;
			if (side != initialSide)
			{
				x = 0;
				vx = 0;
			}
			ref.css("margin-left", x + "px");
		};

		for (var i = 0; i < steps; i++)
		{
			setTimeout(step, i * 30);
		}
	};

	var animateFlyout = function(dir, callback)
	{
		var ref = $(".slide.in");
		var steps = 10;
		var acceleration = 15;
		var x = (swipe.x - swipe.downX);
		var vx = swipe.vx;
		var width = ref.width();

		var firedCallback = false;
		var step = function()
		{
			if (firedCallback)
			{
				return;
			}

			x = parseInt(x + vx);
			vx += acceleration * dir;
			ref.css("margin-left", x + "px");

			if (Math.abs(x) > width && callback && !firedCallback)
			{
				setTimeout(function()
				{
					callback();
				}, 0);
				firedCallback = true;
			}
		};

		for (var i = 0; i < steps; i++)
		{
			setTimeout(step, i * 30);
		}
		setTimeout(function()
		{
			if (!firedCallback && callback)
			{
				callback();
				firedCallback = true;
			}
		}, steps * 30);

		var slideID = me.viewingSlideID;
		setTimeout(function()
		{
			if (me.viewingSlideID == slideID)
			{
				animateReturn(ref);
			}
		}, 500);
	};

	swipe.shouldIgnore = function(e)
	{
		return swipe.handled || me.currentWindow || pinch.isZoomed() || !swipe.onslide || Frame.current.isLightboxShowing() || e.target.tagName == "VIDEO" || player.touchScrolling;
	}

	swipe.bind("mousedown", function (e)
	{
		swipe.onslide = $(e.target).closest(".slide").length > 0;
	});

	swipe.bind("mousemove", function (e)
	{
		if (swipe.shouldIgnore(e))
		{
			return;
		}

		if (swipe.downX != 0)
		{
			if (me.canSwipeNavigate())
			{
				$(".slide.in").css("margin-left", (swipe.x - swipe.downX) + "px");
			}
			else
			{
				$(".slide.in").css("margin-left", "0px");
			}
		}
	});

	swipe.bind("mouseup", function (e)
	{
		if (swipe.shouldIgnore(e))
		{
			return;
		}
		swipe.onslide = false;

		if (!e.isSwipe || (!e.isLong && !e.isFast) || e.swipeDirection == "swipeup" || e.swipeDirection == "swipedown")
		{
			animateReturn();
		}
		else
		{
			if (e.swipeDirection == "swipeleft")
			{
				if (me.currentControlLayout["next"] && me.currentControlEnabled["next"])
				{
					animateFlyout(-1, function ()
					{
						me.raiseNext();
					});
				}
				else if (me.currentControlLayout["submit"] && me.currentControlEnabled["submit"])
				{
					animateReturn();
					me.raiseSubmit();
				}
				else if (me.currentControlLayout["submitall"] && me.currentControlEnabled["submitall"])
				{
					animateReturn();
					me.raiseSubmit();
				}
				else
				{
					animateReturn();
				}
			}
			else
			{
				if (me.currentControlLayout["previous"] && me.currentControlEnabled["previous"])
				{
					animateFlyout(1, function ()
					{
						me.raisePrevious();
					});
				}
				else
				{
					animateReturn();
				}
			}
		}
	});
};

PhoneFrame.prototype.canSwipeNavigate = function()
{
	var me = this;
	var isAvailable = function()
	{
		for (var i = 0; i < arguments.length; i++)
		{
			var controlName = arguments[i];
			if (me.currentControlLayout[controlName] && me.currentControlEnabled[controlName])
			{
				return true;
			}
		}

		return false;
	}

	if (swipe.x == 0)
	{
		return false;
	}

	if (swipe.x < swipe.downX)
	{
		return isAvailable("next", "submit", "submitall");
	}

	return isAvailable("previous");
};

PhoneFrame.prototype.prepLaunchButton = function()
{
	var launchButton = $('<svg viewBox="0 0 100 100" class="svg-play"><use xlink:href="#svg_play_large_bordered"></use></svg>');

	var ref = $(".launch_interstitial>a");
	ref.append(launchButton);
};

PhoneFrame.prototype.updateLaunchTitle = function()
{
	$(".content_title").text(player.meta.title);
};

Frame.prototype.setMetaData = function(meta)
{
	if (player.launch)
	{
		this.updateLaunchTitle();
	}
};

PhoneFrame.prototype.initOrientation = function(portraitOnly, landscapeOnly)
{
	story.frameWidth = player.width;
	story.frameHeight = player.height;
	this.containerWidth = player.width;
	this.containerHeight = player.height;

	if ((self != top && !player.isCrossDomainFrame)
		|| (player.isCrossDomainFrame && player.isIOS && !player.isIOSlt8))
	{
		// Framed LMS.  Fit to the window we're given.
		var portrait = FrameKit.isPortrait();
		DefaultFrame.prototype.initOrientation.call(this, portrait, !portrait);
		return;
	}

	var isPortrait = FrameKit.isPortrait();

	// NOTE: deviceWidth and deviceHeight are LANDSCAPE dimensions.  Rotating the device does NOT change that.
	var windowSize = DefaultFrame.getWindowSize(true);
	var innerWidth = windowSize.width;
	var innerHeight = windowSize.height;

	this.hideNav();

	if (!isPortrait)
	{
		this.currentLayout = PhoneFrame.LAYOUT_LANDSCAPE;
	}
	else if (this.tabCount == 1)
	{
		this.currentLayout = PhoneFrame.LAYOUT_PORTRAIT_SINGLE;
	}
	else if (!player.isSmallDevice)
	{
		this.currentLayout = PhoneFrame.LAYOUT_PORTRAIT_WIDE;
	}
	else
	{
		this.currentLayout = PhoneFrame.LAYOUT_PORTRAIT_NARROW;
	}

	var frameScale;
	var availableWidth, availableHeight;
	if (isPortrait)
	{
		availableHeight = innerHeight - this.navBarWidth;
		availableWidth = innerWidth;
	}
	else
	{
		availableHeight = innerHeight;
		availableWidth = innerWidth - this.navBarWidth;
	}

	var browserAspectRatio = availableWidth / availableHeight;
	this.aspectRatio = player.width / player.height;

	if (this.aspectRatio > browserAspectRatio)
	{
		// Dominated by width.  Should center vertically
		frameScale = availableWidth / player.width;
	}
	else
	{
		// Dominated by height.  Should center horizontally
		frameScale = availableHeight / player.height;
	}

	this.frameScale = frameScale;
	this.portraitFrameScale = frameScale;
	this.landscapeFrameScale = frameScale;
	player.frameScale = frameScale;

	var containerTop = Math.floor((availableHeight - player.height * frameScale) / 2);
	if (containerTop < 0)
	{
		containerTop = 0;
	}

	var containerLeft = Math.floor((availableWidth - player.width * frameScale) / 2);
	if (containerLeft < 0)
	{
		containerLeft = 0;
	}
	this.containerLeft = containerLeft;
	this.containerTop = containerTop;
	this.containerLeftPortrait = containerLeft;
	this.containerTopPortrait = containerTop;
	this.containerLeftLandscape = containerLeft;
	this.containerTopLandscape = containerTop;

	var css = "#framewrap{-webkit-transform-origin:top left;"
		+ "-webkit-transform:translate3d(0px,0px,0px) scale(" + frameScale + ");"
		+ "width:" + player.width + "px;"
		+ "height:" + player.width + "px;"
		+ "top:" + containerTop + "px!important; left:" + containerLeft + "px!important;"
		+ ".interstitial{height:" + availableHeight + "px;width:" + availableWidth + "px;}"
		+ "}";

	var launchPlaySize = Math.min(availableHeight, availableWidth) * 0.25;
	launchPlaySize = Math.min(launchPlaySize, 200);
	css += "div.launch_interstitial>a{"
		+ "width:" + launchPlaySize + "px;"
		+ "height:" + launchPlaySize + "px;"
		+ "margin-left:" + -launchPlaySize / 2 + "px;"
		+ "margin-top:" + -launchPlaySize / 2 + "px;"
	+ "}";

	if (player.frameStyleSheet)
	{
		document.body.removeChild(player.frameStyleSheet);
	}
	player.frameStyleSheet = document.createElement("style");
	player.frameStyleSheet.innerHTML = css;
	document.body.appendChild(player.frameStyleSheet);

	this.frameBounds = new ppRect(0, 0, availableWidth, availableHeight);

	if (this.resumePrompt && this.resumePrompt.ref)
	{
		this.resumePrompt.applySize();
	}
};

DefaultFrame.prototype.updateFrame = function(force)
{
	if (player.hasNavOutsideFrame && player.fitToFrameContainer)
	{
		player.fitToFrameContainer();
	}

	window.scrollTo(0, 0);

	var visibleTabCount = 0;
	var singleTabName = "";
	for (var i = 0; i < this.menuTabs.length; i++)
	{
		if (Frame.current.currentControlLayout[this.menuTabs[i]])
		{
			visibleTabCount++;
			singleTabName = this.menuTabs[i];
		}
	}

	// Hide the navbar if it is empty
	this.navBar.show();
	var visibleIconCount = Frame.current.navBar.find(".entity-icon:visible").length;
	var previousNavWidth = this.navBarWidth;
	if (visibleIconCount == 0)
	{
		this.navBar.hide();
		this.navBarWidth = 0;
	}
	else
	{
		this.navBarWidth = this.visibleNavBarWidth;
	}

	if (previousNavWidth != this.navBarWidth)
	{
		this.initOrientation();
	}

	// Hide the menu button if it has no items, special case if it has only one.
	var menuButton = $(".control-menu");
	if (visibleTabCount == 0)
	{
		menuButton.hide();
		menuButton.removeClass("single");
	}
	else if (visibleTabCount == 1)
	{
		menuButton.show();
		menuButton.addClass("single");
		var title = $(".toptab." + singleTabName + ">.label").text();
		$(".text-menu").text(title);
	}
	else
	{
		menuButton.show();
		menuButton.removeClass("single");
	}

	if (visibleTabCount != this.tabCount)
	{
		this.tabCount = visibleTabCount;
		this.initOrientation();
	}


	this.activateFirstTablistItem();

	DefaultFrame.resizeSpinners();

	if (player.width == 1)
	{
		// size not yet set.
		return;
	}

	if (player.currentZoomImage)
	{
		player.currentZoomImage.zoomedImage.css("-webkit-transition-property", "");
		player.currentZoomImage.zoomedImage.css("-webkit-transition-duration", "0");
		player.currentZoomImage.zoomedImage.css("-moz-transition-property", "");
		player.currentZoomImage.zoomedImage.css("-moz-transition-duration", "0");
		player.currentZoomImage.zoomedImage.css("-ms-transition-property", "");
		player.currentZoomImage.zoomedImage.css("-ms-transition-duration", "0");

		player.currentZoomImage.setZoomedCSS(player.currentZoomImage.zoomedImage);
	}

	$.each(story.children, function(key, child)
	{
		if (child.innerType == "Window")
		{
			child.resize();
		}
	});

	setTimeout(function()
	{
		pinch.updateOrientation();
		pinch.ensureOnscreen();
	}, 100);
};

PhoneFrame.prototype.activateFirstTablistItem = function()
{
	$(".navcontainer")[0].className = "navcontainer";

	if ($(".toptab.visible.active").length == 0
	&& (this.currentLayout == PhoneFrame.LAYOUT_LANDSCAPE || this.currentLayout == PhoneFrame.LAYOUT_PORTRAIT_SINGLE))
	{
		$(".toptab.visible:not(.presenter)>span").first().trigger(player.isMobile ? "touchend" : "click");
	}
};

PhoneFrame.prototype.updatePlayerLayout = function()
{
	this.availableSlideWidth = this.containerWidth;
	this.availableSlideHeight = this.containerHeight;

	this.resizeProgressBar();
};

PhoneFrame.prototype.setFrameLayout = function(layoutName, controlMap, win)
{
	$(".entity-icon.disabled").removeClass("disabled");
	DefaultFrame.prototype.setFrameLayout.call(this, layoutName, controlMap, win);
};


PhoneFrame.prototype.resizeNavContainer = function(controlRef)
{
	var navHeight = window.innerHeight;
	var menuContentWidth = window.innerWidth;

	switch (this.currentLayout)
	{
		case PhoneFrame.LAYOUT_LANDSCAPE:
			menuContentWidth -= 240;
			break;

		case PhoneFrame.LAYOUT_PORTRAIT_NARROW:
		case PhoneFrame.LAYOUT_PORTRAIT_WIDE:
		case PhoneFrame.LAYOUT_PORTRAIT_SINGLE:
			navHeight -= $(".nav-bar").height();
			menuContentWidth -= 40;
			break;
	}

	this.navContainer.css("height", navHeight);
	$(".menu_container").css("width", menuContentWidth);

};

PhoneFrame.prototype.resizeProgressBar = function(controlRef)
{
	var totalButtonWidth = 0;
	$(".nav-bar").children(":visible").each(function(index, control)
	{
		if (control.className.indexOf("progress-container") < 0)
		{
			totalButtonWidth += $(control).outerWidth(true);
		}
	});

	$(".progress-container").css("width", window.innerWidth - totalButtonWidth - 20);
};

PhoneFrame.prototype.applyColorSchemes = function()
{
	this.seekColor = "#fff";
	this.seekBackgroundColor = "#6c6f71";

	var sheet = new CustomStyleSheet();

	sheet.add("ul.slidelist li.correct:before", "background-image", "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><style>.st0{fill:%23529900;} .st1{fill:%23FFFFFF;}</style><circle class='st0' cx='50.3' cy='50' r='50'/><path class='st1' d='M73.4 29.1c1.8 1.6 3.4 3 5.1 4.5-.5.6-.8 1.1-1.2 1.6-9.1 10.5-18.1 21-27.2 31.5-2.5 2.8-4 2.9-6.6.1-5.3-5.7-10.5-11.4-15.8-17.1-.5-.5-.9-1-1.6-1.8 1.8-1.4 3.5-2.8 5.3-4.3 4.8 5.3 9.9 10.8 15.2 16.6 9.2-10.6 18.1-21 26.8-31.1z'/></svg>\")");
	sheet.add("ul.slidelist li.correct:before", "height", "32px");
	sheet.add("ul.slidelist li.correct:before", "width", "32px");
	sheet.add("ul.slidelist li.incorrect:before", "background-image", "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><style>.st0{fill:%23B7442C;} .st1{fill:%23FFFFFF;}</style><circle class='st0' cx='50.3' cy='50' r='50'/><path class='st1' d='M54.8,49.5c5.4-5.2,10.5-10.2,15.2-14.8c-1.6-1.8-3.1-3.5-4.8-5.4c-5.1,5.1-10.1,10.2-15.4,15.4 c-5-5.1-10-10.1-14.7-14.8c-1.7,1.6-3.4,3.1-5.3,4.9c5,5,10,10,15.2,15.2C40,55.1,35,60.1,30.1,65c1.7,1.7,3.3,3.3,5,5.1 c5-5,10-10.1,15.3-15.5c5.2,5.3,10.3,10.3,15,15.1c1.6-1.5,3.3-3,5-4.6C65.4,60.1,60.4,55.1,54.8,49.5z'/></svg>\")");
	sheet.add("ul.slidelist li.incorrect:before", "height", "32px");
	sheet.add("ul.slidelist li.incorrect:before", "width", "32px");

	sheet.build();
};


PhoneFrame.prototype.addSideTab = function(group, title, content, name, ignoreSlideLock)
{
	this.addTopTab(group, title, content, name, ignoreSlideLock);
};

PhoneFrame.prototype.getFrameScale = function()
{
	// onBody window slides will be outside of our frame scale, so we won't apply it when getting slide coords.
	if (this.currentWindow && this.currentWindow.isExternal())
	{
		return 1.0;
	}

	return this.frameScale;
};

PhoneFrame.prototype.showMobileInterstitial = function(callback)
{
	player.launch = $('<div class="launch_interstitial"><span class="content_title"></span><a></a></div>');
	$(document.body).prepend(player.launch);
	this.prepLaunchButton();
	this.updateLaunchTitle();

	player.launch.show();

	var trigger = player.isDesktop ? "mousedown" : "touchstart";
	if (player.isIOS && !player.isIOSlt9)
	{
		// iOS9 stopped allowing touchstart to play media.  Click and touchend still work.
		trigger = "touchend";
	}

	player.launch.bind(trigger, function(e)
	{
		player.launch.hide();
		callback(e);
		e.stopPropagation();
	});

	var reorientLaunch = function()
	{
		var orientation = player.isCrossDomainFrame ? window.orientation : top.window.orientation;

		if (orientation != player.lastLaunchOrientation ||
			window.innerWidth != player.lastLaunchWidth ||
			window.innerHeight != player.lastLaunchHeight)
		{
			player.lastLaunchOrientation = orientation;
			player.lastLaunchWidth = window.innerWidth;
			player.lastLaunchHeight = window.innerHeight;

			player.launch.css("width", window.innerWidth);
			player.launch.css("height", window.innerHeight);

			var titleRef = $(".content_title");
			var titlePad = Math.floor(window.innerWidth * 0.1);
			titleRef.css("width", window.innerWidth - titlePad * 2);
			titleRef.css("padding-left", titlePad);

		}
	};

	player.reorientLaunchInterval = setInterval(function()
	{
		reorientLaunch();
	}, 100);

	window.addEventListener('orientationchange', reorientLaunch);
	reorientLaunch();
};

Frame.startOrientationWatcher = function()
{
	if (Frame.orientationWatcher)
	{
		return;
	}

	// We'll need to notice when the user has left fullScreen mode and resize the player again
	var lastHeight = window.innerHeight;
	setInterval(function()
	{
		if (window.innerHeight != lastHeight || Frame.current.boundsChangedRequired)
		{
			if (!pinch.panning && !pinch.zooming && pinch.scale == 1)
			{
				Frame.current.initOrientation();
				Frame.current.updateFrame();
				Frame.current.updatePlayerLayout();
				Frame.current.raiseBoundsChanged();
				Frame.current.boundsChangedRequired = false;
			}
			else
			{
				Frame.current.boundsChangedRequired = true;
			}
		}
		lastHeight = window.innerHeight;
	}, 300);
};

Frame.requestFullScreen = function()
{
	if (location.search.indexOf("phone=") > -1)
	{
		// disable for desktop browsers simulating mobile player
		return false;
	}

	var doc = document.documentElement;
	var requestFullScreen = doc.requestFullScreen
		|| doc.webkitRequestFullScreen
		|| doc.mozRequestFullScreen;

	var success = false;
	if (requestFullScreen)
	{
		requestFullScreen.call(doc);
		Frame.startOrientationWatcher();

		success = true;
	}

	return success;
};

PhoneFrame.prototype.initPresenterTab = function()
{
	if (this.addedPresenterTab)
	{
		return;
	}

	this.presenterContainer = $("<div class='presenter_container'></div>");
	this.presenterTab = this.addTopTab("presenter", "Presenter Bio", this.presenterContainer, "presenter", true);
	this.addedPresenterTab = true;
};

PhoneFrame.prototype.updatePresenter = function(presenterref, presentervideourl)
{
	var presenter = this.presenters[presenterref];
	if (presenter)
	{
		this.initPresenterTab();
		presenter.showDetail(this.presenterContainer);
		this.presenterTab.show();
	}
	else if (this.presenterTab)
	{
		this.presenterTab.hide();
	}

	// TODO: else if (presentervideourl), once we have a UI for it.
};

Presenter.prototype.showDetail = function(container)
{
	if (!this.constructedCard)
	{
		// NOTE: bio is given as an HTML chunk containing name & title with formatting.  
		// We'll lop off all but the last two paragraphs, since they contain the actual bio text.
		var bioParagraphs = $(this.bioHtml).splice(-2);

		this.card = $("<div class='presenter_card'><div class='presenter_photo'/><span class='presenter_bio'/><a class='presenter_mail'><svg viewBox='0 0 100 100' class='svg-icon'><use xlink:href='#svg_email'></use></svg></a></div>");
		this.card.children(".presenter_mail").attr("href", "mailto:" + this.email);
		this.card.children(".presenter_mail").attr("target", "_blank");
		this.card.children(".presenter_photo").css("background-image", "url(" + player.basepath + this.mobilephoto + ")");
		container.prepend(this.card);

		var bioSection = this.card.children(".presenter_bio");
		bioSection.append($("<h2>").text(this.name));
		if (this.title)
		{
			bioSection.append($("<h3>").text(this.title));
		}
		bioSection.append(bioParagraphs);

		if (!this.email)
		{
			this.card.children(".presenter_mail").hide();
		}
		if (!this.mobilephoto)
		{
			this.card.children(".presenter_photo").hide();
		}

		this.constructedCard = true;
	}
	$(".presenter_card").hide();
	this.card.show();
}

ProgressBar.prototype.initProgressRing = function()
{
	this.progressRingCenter = 13.5;
	this.progressRingRadius = 11.5;
	this.progressRingOffset = 0;
	this.progressRingThickness = 1.5;

	if (!player.isSmallDevice)
	{
		this.progressRingCenter = 17;
		this.progressRingRadius = 14;
		this.progressRingOffset = 0;
		this.progressRingThickness = 2;
	}

	this.ringCanvas = document.createElement("CANVAS");
	this.ringCanvas.className = "icon-overlay";
	this.ringCanvas.width = 62;
	this.ringCanvas.height = 62;
	this.ringContext = this.ringCanvas.getContext("2d");
	$(".entity-icon.pause").parent().prepend($(this.ringCanvas));
};

ProgressBar.prototype.updateBase = ProgressBar.prototype.update;
ProgressBar.prototype.update = function()
{
	this.ringContext.clearRect(0, 0, this.ringCanvas.width, this.ringCanvas.height);

	if (Frame.current.currentLayout == PhoneFrame.LAYOUT_LANDSCAPE)
	{
		var percent = Math.min(parseFloat(this.index / this.count), 1);

		this.ringContext.beginPath();
		this.ringContext.lineWidth = this.progressRingThickness;
		this.ringContext.arc(this.progressRingCenter, this.progressRingCenter, this.progressRingRadius, 0, Math.PI * 2);
		this.ringContext.strokeStyle = "#4a4a4a";
		this.ringContext.stroke();

		this.ringContext.beginPath();
		this.ringContext.lineWidth = this.progressRingThickness;
		this.ringContext.arc(this.progressRingCenter, this.progressRingCenter, this.progressRingRadius, Math.PI * 3 / 2, Math.PI * (3 / 2 + 2 * percent));
		this.ringContext.strokeStyle = "#fff";
		this.ringContext.stroke();
	}
	else
	{
		this.ringContext.fillStyle = "#474747";
		this.ringContext.beginPath();
		this.ringContext.arc(this.progressRingCenter, this.progressRingCenter, this.progressRingRadius + this.progressRingThickness / 2, 0, Math.PI * 2);
		this.ringContext.fill();

		this.updateBase();
	}
};

SlideList.prototype.scrollSelectedIntoView = function(duration)
{
	Frame.current.resizeNavContainer();

	var list = Frame.current.navContainer.get(0);
	var display = list.style.display;
	list.style.display = "block";

	var listHeight = list.offsetHeight;
	var scrollTop = list.scrollTop;

	$(".slidelist .selected").each(function(index, selected)
	{
		var scrollContainer = $(selected).closest(".menu_container");
		if (scrollContainer.length == 0)
		{
			return;
		}

		var listTop = scrollContainer.get(0).offsetTop;
		var selectedTop = $(selected).position().top;
		var selectedHeight = $(selected).height();

		var maxTop = selectedTop - selectedHeight; // allow one row above and below the selected item
		var minTop = selectedTop + listTop - listHeight + selectedHeight * 2;

		if (scrollTop < minTop)
		{
			list.scrollTop = minTop;
		}
		if (scrollTop > maxTop)
		{
			if (maxTop < selectedHeight)
			{
				maxTop = 0;
			}
			list.scrollTop = maxTop;
		}
	});

	list.style.display = display;
};

SlideList.SetIconPositions = function(strSelector, strSide, nIndent)
{
	SlideList.styleSheet.add(".toptab " + strSelector + ".correct:before", strSide, (270 - nIndent) + "px");
	SlideList.styleSheet.add(".toptab " + strSelector + ".incorrect:before", strSide, (270 - nIndent) + "px");
};

TranscriptPanel.prototype.loadFromXMLBase = TranscriptPanel.prototype.loadFromXML;
TranscriptPanel.prototype.loadFromXML = function(xml)
{
	this.loadFromXMLBase(xml);
	$.each(this.transcripts, function(index, transcript)
	{
		transcript.notespng = null;
	});
};

GlossaryPanel.prototype.createRef = function(xml)
{
	if (this.ref)
	{
		return false;
	}

	var ref = $("<div class='glossary_container'></div>");
	$.each(this.terms, function(index, term)
	{
		var title = $("<h2>" + term.title + "</h2>");
		var text = $("<p>" + term.definition + "</p>");
		ref.append(title);
		ref.append(text);
	});

	this.ref = ref;

	return true;
};

TimerComponent.prototype.show = function()
{
	this.captionRef = Frame.current.timerSection;
	this.captionRef.show();
};

TimerComponent.prototype.hide = function()
{
	this.captionRef.hide();
};

TimerComponent.prototype.render = function()
{
	if (!this.captionRef)
	{
		return;
	}

	var remaining = this.duration - this.currentPosition;
	this.captionRef.html(TimerComponent.FormatMS(remaining, true));

	if (Math.floor(remaining / 1000) <= 10)
	{
		this.captionRef.addClass("final");
	}
	else
	{
		this.captionRef.removeClass("final");
	}
}

WindowComponent.prototype.prepareLightboxBase = WindowComponent.prototype.prepareLightbox;
WindowComponent.prototype.prepareLightbox = function()
{
	var me = this;
	this.prepareLightboxBase();
	$(document.body).prepend($(".frameInterstitial"));
	if (!this.closeButtonPrepared)
	{
		this.closeIcon.remove();
		this.closeIcon = $('<div class="entity-icon lightbox-close"><svg viewBox="0 0 52 52" class="svg-icon"><use xlink:href="#svg_close"></use></svg></div>');
		this.closeIcon.click(function()
		{
			Frame.current.raiseCloseWindow(me.id);

		});
		this.closeButtonPrepared = true;
	}
};

WindowComponent.prototype.prepareControls = function()
{
	if (this.controls)
	{
		return;
	}

	var controls = $(Frame.templateData).children(".nav-bar");
	if (controls.length == 0)
	{
		return;
	}

	this.controls = controls.clone(false);
	this.controls.children().not(".nav-end-container").remove();
	this.controls.find(".timer-section").remove();
	this.ref.append(this.controls);
	this.controls.show();
};

WindowComponent.prototype.applySize = function(slide)
{
	if (this.isPrompt)
	{
		this.ref.css("left", Frame.current.availableSlideWidth / 2 - this.width / 2);
		this.ref.css("top", Frame.current.availableSlideHeight / 2 - this.height / 2);
		this.ref.css("margin", 0);
		return;
	}

	if (!this.isLightbox)
	{
		$("#slidecontainer").append(this.ref);
	}
	if (Frame.current.frameScale != 1 && !this.isPrompt)
	{
		var lightboxScale = 0.85;
		var isPortrait = FrameKit.isPortrait();
		var slideWidth = Math.floor((this.originalWidth - 4) / lightboxScale);
		var slideHeight = Math.floor((this.originalHeight - (this.hasControls ? 42 : 4)) / lightboxScale);

		var lightboxNavWidth = (this.hasControls && !isPortrait ? Frame.current.navBarWidth : 0);
		var lightboxNavHeight = this.hasControls && isPortrait ? Frame.current.navBarWidth : 0;
		var combinedNavWidth = lightboxNavWidth + (!isPortrait ? Frame.current.navBarWidth : 0);
		var combinedNavHeight = lightboxNavHeight + (isPortrait ? Frame.current.navBarWidth : 0);

		var availableWidth = Math.floor(window.innerWidth * lightboxScale) - combinedNavWidth;
		var availableHeight = Math.floor(window.innerHeight * lightboxScale) - combinedNavHeight;

		if (slideWidth / slideHeight > availableWidth / availableHeight)
		{
			this.width = availableWidth;
			this.height = Math.floor(this.width * slideHeight / slideWidth);
		}
		else
		{
			this.height = availableHeight;
			this.width = Math.floor(this.height * slideWidth / slideHeight);
		}

		this.width += lightboxNavWidth;
		this.height += lightboxNavHeight;
		this.contentRef.css("width", this.width);
		this.contentRef.css("height", this.height);

		if (!isPortrait && this.hasControls)
		{
			this.controls.prepend(this.closeIcon);
		}
		else
		{
			$("#windowcontainer").append(this.closeIcon);
		}
	}
	

	this.ref.css("width", this.width);
	this.ref.css("height", this.height);
	this.ref.css("margin", "auto");

	switch (this.align)
	{
		case "center":
			this.ref.css("left", "50%");
			this.ref.css("margin-left", -this.width / 2);
			break;

		default:
			console.log("unknown window align", this.align);
	}

	switch (this.valign)
	{
		case "center":
			this.ref.css("top", "50%");
			this.ref.css("margin-top", -this.height / 2);
			break;

		default:
			console.log("unknown window valign", this.valign);
	}

};

PhoneFrame.prototype.setWindowVisible = function(windowRef, visible)
{
	this.hideNav();
	DefaultFrame.prototype.setWindowVisible.call(this, windowRef, visible);
}

WindowComponent.prototype.showBase = WindowComponent.prototype.show;
WindowComponent.prototype.show = function()
{
	this.showBase();
	if (this.hasControls)
	{
		this.prepareControls();
	}

	this.closeIcon && this.closeIcon.show();
};

WindowComponent.prototype.hideBase = WindowComponent.prototype.hide;
WindowComponent.prototype.hide = function()
{
	this.hideBase();
	this.closeIcon && this.closeIcon.hide();
};

DefaultFrame.prototype.getWindowBounds = function(windowRef)
{
	this.currentWindow = null;

	var win = this.windows[windowRef];
	if (win)
	{
		var bounds = win.contentRef.offset();
		bounds.width = win.width;
		bounds.height = win.height;

		if (win.isLightbox && win.hasControls)
		{
			if (FrameKit.isPortrait())
			{
				bounds.height -= this.navBarWidth;
			}
			else
			{
				bounds.width -= this.navBarWidth;
			}
		}

		this.currentWindow = win;
		return bounds;
	}

	return { left: 0, top: 0, width: this.availableSlideWidth, height: this.availableSlideHeight };
};

PhoneFrame.prototype.getSlideBounds = function(windowRef, domSlide)
{
	if (domSlide)
	{
		var bounds = { left: this.containerLeft, top: this.containerTop };

		if (this.currentWindow)
		{
			bounds = domSlide.offset();

			if (!this.currentWindow.isLightbox)
			{
				bounds.left -= pinch.matrix.m[4] * this.frameScale;
				bounds.top -= pinch.matrix.m[5] * this.frameScale;
			}
		}

		this.slideBounds = ppRect.FromWidthHeight(bounds.left, bounds.top, domSlide.width(), domSlide.height());
	}

	return this.slideBounds;
};

var pinch = {};
pinch.scale = 1;
pinch.isPortrait = FrameKit.isPortrait();
pinch.matrix = new MatrixTransform();
pinch.workingMatrix = new MatrixTransform();
pinch.panning = false;
pinch.zooming = false;
pinch.width = window.innerWidth;
pinch.height = window.innerHeight;


pinch.reset = function()
{
	pinch.scale = 1;
	pinch.matrix = new MatrixTransform();
	pinch.workingMatrix = new MatrixTransform();
	pinch.panning = false;
	pinch.zooming = false;

	if (pinch.container)
	{
		pinch.slideContainer.css("-webkit-transition-property", "none");
		pinch.slideContainer.css("-webkit-transition-duration", "0");
		pinch.slideContainer.css("-webkit-transform", pinch.matrix.toCSSTransform());

		pinch.windowContainer.css("-webkit-transition-property", "none");
		pinch.windowContainer.css("-webkit-transition-duration", "0");
		pinch.windowContainer.css("-webkit-transform", pinch.matrix.toCSSTransform());
	}
};

pinch.updateOrientation = function()
{
	var isPortrait = FrameKit.isPortrait();

	if (!pinch.isZoomed() || isPortrait == pinch.isPortrait)
	{
		return;
	}

	Frame.current.initOrientation();

	var x = (pinch.matrix.m[4] - window.innerHeight / 2) / pinch.scale;
	var y = (pinch.matrix.m[5]- window.innerWidth / 2) / pinch.scale;

	var factor = pinch.frameScale / Frame.current.frameScale;
	pinch.scale *= factor;

	pinch.matrix.translate(-x, -y);
	pinch.matrix.scale(factor, factor);
	pinch.matrix.translate(x, y);

	pinch.apply();

	pinch.frameScale = Frame.current.frameScale;
	pinch.isPortrait = isPortrait;

	pinch.ensureOnscreen(false);
};

pinch.isZoomed = function()
{
	return pinch.panning || pinch.zooming || pinch.scale != 1;
};

pinch.setContext = function()
{
	if (Frame.current.currentWindow && !Frame.current.currentWindow.isPrompt)
	{
		pinch.container = pinch.windowContainer;
		pinch.frameScale = 1;
	}
	else
	{
		pinch.container = pinch.slideContainer;
		pinch.frameScale = Frame.current.frameScale;
	}
}

pinch.ensureOnscreen = function(animated)
{
	if (!pinch.container)
	{
		return false;
	}

	var apply = function()
	{
		if (animated)
		{
			pinch.applyAnimated();
		}
		else
		{
			pinch.apply();
		}
	}

	if (pinch.scale == 1)
	{
		pinch.workingMatrix.m[4] = 0;
		pinch.workingMatrix.m[5] = 0;
		apply();
		return false;
	}

	var isPortrait = FrameKit.isPortrait();
	var navWidth = isPortrait ? 0 : Frame.current.navBarWidth;
	var navHeight = isPortrait ? Frame.current.navBarWidth : 0;

	var baseSlide = story.allSlides[player.slideIndex];
	var height = baseSlide.height;
	var width = baseSlide.width;

	var win = Frame.current.currentWindow;
	if (win && win.isLightbox)
	{
		if (win.hasControls)
		{
			if (FrameKit.isPortrait())
			{
				height += Frame.current.navBarWidth;
			}
			else
			{
				width += Frame.current.navBarWidth;
			}
		}
	}

	var totalScale = Frame.current.frameScale * pinch.scale;

	var fitX = width * totalScale <= window.innerWidth - navWidth;
	var fitY = height * totalScale <= window.innerHeight - navHeight;

	// these are frame-space coords relative to framewrap:
	var topLeft = pinch.workingMatrix.transformPoint(0, 0);
	var bottomRight = pinch.workingMatrix.transformPoint(width, height);

	// This is the unscaled absolute screen position
	topLeft.x = topLeft.x * Frame.current.frameScale + Frame.current.containerLeft;
	topLeft.y = topLeft.y * Frame.current.frameScale + Frame.current.containerTop;
	bottomRight.x = bottomRight.x * Frame.current.frameScale + Frame.current.containerLeft;
	bottomRight.y = bottomRight.y * Frame.current.frameScale + Frame.current.containerTop;

	var moved = false;

	var offLeft = -topLeft.x / totalScale;
	var offRight = (window.innerWidth - navWidth - bottomRight.x) / totalScale;
	var offTop = -topLeft.y / totalScale;
	var offBottom = (window.innerHeight - navHeight - bottomRight.y) / totalScale;

	if (offLeft < 0 && offRight < 0)
	{
		moved = true;
		if (fitX)
		{
			pinch.workingMatrix.translate(offRight, 0);
		}
		else
		{
			pinch.workingMatrix.translate(offLeft, 0);
		}
	}

	if (offRight > 0 && offLeft > 0)
	{
		moved = true;
		if (fitX)
		{
			pinch.workingMatrix.translate(offLeft, 0);
		}
		else
		{
			pinch.workingMatrix.translate(offRight, 0);
		}
	}

	if (offTop < 0 && offBottom < 0)
	{
		moved = true;
		if (fitY)
		{
			pinch.workingMatrix.translate(0, offBottom);
		}
		else
		{
			pinch.workingMatrix.translate(0, offTop);
		}
	}

	if (offBottom > 0 && offTop > 0)
	{
		moved = true;
		if (fitY)
		{
			pinch.workingMatrix.translate(0, offTop);
		}
		else
		{
			pinch.workingMatrix.translate(0, offBottom);
		}
	}

	if (moved)
	{
		apply();
	}
	Frame.current.raiseBoundsChanged();

	return moved;
};


PhoneFrame.prototype.initPinchZoomPan = function()
{
	pinch.slideContainer = $("#slidecontainer");
	pinch.windowContainer = WindowComponent.externalContainer;

	window.addEventListener("touchstart", function(e)
	{
		pinch.setContext();

		var touches = getFrameScaledTouches(e.touches);
		if (e.touches.length == 2)
		{
			pinch.panning = false;
			pinch.zooming = true;
			var startCenter = getPinchCenter(touches);
			pinch.startSceneCenter = pinch.matrix.unTransformPoint(startCenter.x, startCenter.y);
			pinch.startDistance = getPinchDistance(touches) / pinch.frameScale;
			pinch.isPortrait = FrameKit.isPortrait();
			pinch.frameScale = Frame.current.frameScale;

			if (Frame.current.currentWindow && Frame.current.currentWindow.isLightbox)
			{
				pinch.frameScale = 1;
			}
		}

		if (e.touches.length == 1 && pinch.scale != 1)
		{
			pinch.panning = true;
			pinch.zooming = false;
			pinch.startSceneCenter = pinch.matrix.unTransformPoint(touches[0].screenX, touches[0].screenY);
		}

		return true;
	});

	window.addEventListener("touchend", function(e)
	{
		if (e.touches.length < 2 && (pinch.panning || pinch.zooming))
		{
			pinch.panning = false;
			pinch.zooming = false;

			pinch.scale = pinch.workingMatrix.getScale().x;
			pinch.ensureOnscreen(true);

			pinch.matrix = pinch.workingMatrix;
		}

		return true;
	});

	window.addEventListener("touchmove", function(e)
	{
		if (e.touches.length == 2 && pinch.zooming)
		{
			updatePinchZoom(getFrameScaledTouches(e.touches));
			e.preventDefault();
			return false;
		}

		if (e.touches.length == 1 && pinch.scale != 1 && pinch.panning && !Frame.current.getDragging() && !DragItem.cargo)
		{
			updatePinchPan(getFrameScaledTouches(e.touches));
			e.preventDefault();
			return false;
		}

		return true;
	});

	var updatePinchZoom = function(touches)
	{
		var currentDist = getPinchDistance(touches) / pinch.frameScale;
		var zoom = currentDist / pinch.startDistance;
		zoom = Math.max(1 / pinch.scale, Math.min(zoom, 6 / pinch.scale));

		var currentCenter = getPinchCenter(touches);
		var currentSceneCenter = pinch.matrix.unTransformPoint(currentCenter.x, currentCenter.y);

		pinch.workingMatrix = pinch.matrix.copy();
		pinch.workingMatrix.translate(currentSceneCenter.x, currentSceneCenter.y);
		pinch.workingMatrix.scale(zoom, zoom);
		pinch.workingMatrix.translate(-pinch.startSceneCenter.x, -pinch.startSceneCenter.y);

		pinch.container.css("-webkit-transform-origin", "top left");
		pinch.container.css("-webkit-transform", pinch.workingMatrix.toCSSTransform());
	};


	var updatePinchPan = function(touches)
	{
		var currentSceneCenter = pinch.matrix.unTransformPoint(touches[0].screenX, touches[0].screenY);

		pinch.workingMatrix = pinch.matrix.copy();
		pinch.workingMatrix.translate(currentSceneCenter.x - pinch.startSceneCenter.x, currentSceneCenter.y - pinch.startSceneCenter.y);

		pinch.apply();
	};


	var getFrameScaledTouches = function(touches)
	{
		var t2 = [];
		for (var i = 0; i < touches.length; i++)
		{
			var touch = touches[i];
			t2.push({ screenX: touch.screenX / pinch.frameScale, screenY: touch.screenY / pinch.frameScale });
		}

		return t2;
	}

	var getPinchDistance = function(touches)
	{
		if (!touches || touches.length < 2)
		{
			return 1;
		}

		return Math.sqrt(Math.pow(touches[0].screenX - touches[1].screenX, 2) + Math.pow(touches[0].screenY - touches[1].screenY, 2));
	}

	var getPinchCenter = function(touches)
	{
		if (!touches || touches.length < 2)
		{
			return { x: 0, y: 0 };
		}

		var x = (touches[0].screenX + touches[1].screenX) / 2;
		var y = (touches[0].screenY + touches[1].screenY) / 2;

		return { x: x, y: y };

	}

	var getRawSlideCoords = swipe.getSlideCoords;
	swipe.getSlideCoords = function(slide)
	{
		var coords;
		if (!Frame.current.currentWindow || !Frame.current.currentWindow.isLightbox)
		{
			coords = getRawSlideCoords(slide);
			return pinch.matrix.unTransformPoint(coords.x, coords.y);
		}

		var uBounds = pinch.matrix.unTransformPoint(Frame.current.slideBounds.left, Frame.current.slideBounds.top);
		var uMouse = pinch.matrix.unTransformPoint(swipe.x, swipe.y);

		uMouse.x -= uBounds.x;
		uMouse.y -= uBounds.y;
		return uMouse;
	};
	StageItem.prototype.fixPositionEventBase = DragItem.prototype.fixPositionEvent;
	DragItem.prototype.fixPositionEvent = function(event)
	{
		// TODO: see if we can kill off fixPositionEvent.  
		// MouseEvents seems happy to work with unmodified position events.  No reason DragItems shouldn't be able to too.
		if (!event.fixed)
		{
			this.fixPositionEventBase(event);

			var reFixed = pinch.matrix.unTransformPoint(event.pageX, event.pageY);
			event.pageX = reFixed.x;
			event.pageY = reFixed.y;
		}

		return event;
	};


};

pinch.applyAnimated = function()
{
	pinch.container.css("-webkit-transition-property", "-webkit-transform");
	pinch.container.css("-webkit-transition-duration", "0.4s");
	pinch.apply();
	setTimeout(function()
	{
		pinch.container.css("-webkit-transition-property", "none");
		pinch.container.css("-webkit-transition-duration", "0");
	}, 400);
}

pinch.apply = function()
{
	pinch.container.css("-webkit-transform-origin", "top left");
	pinch.container.css("-webkit-transform", pinch.workingMatrix.toCSSTransform());
};


ProgressBar.DefaultHeight = 2;
ProgressBar.DefaultContainerHeight = 62;
ProgressBar.DefaultBorderRadius = 0;
ProgressBar.DefaultHandleRadius = 6.5;
ProgressBar.DefaultHandleThickness = 2;
ProgressBar.DefaultHandleFill = false;

if (!player.isSmallDevice)
{
	ProgressBar.DefaultContainerHeight = 75;
}



player.frameReady(new PhoneFrame());


