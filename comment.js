(function() {
	
"use strict";	
	
L.Comment = L.Class.extend({
	options : {
		backgroundColor    : "white",
		textColor          : "black",
		onDragMessage      : "Click to drop me somewhere!",
		onClickPlaceholder : "What is interesting here?",
		useCookies         : true,
		cookieStamp        : "L-Comment-",
		onInput            : null,
	},
	initialize : function(opts) {
		L.Util.setOptions(this, opts);
		return this;
	},
	addTo : function(map) {
		return this.onAdd(map);
	},
	onAdd : function(map) {
		this._map = map;
		return this._enable();
	},
	remove : function() {
		return this.removeFrom(this._map);
	},
	removeFrom : function(map) {
		if (map === this._map) {
			this._disable();
		}
		return this;
	},
	/**
	 * @public
	 */
	clearCookieStorage : function() {
		document.cookie.split(/; */).forEach(function(cookie) {
			cookie = cookie.split("=")[0];
			if (cookie.indexOf(cookieStamp) > -1) {
				document.cookie = cookie + "=; Max-Age=0";
			}
		});
	}
});

var CommentCounter = 0;

L.Comment.include({
	/**
	 * @private
	 */
	_enable : function() {
		if (!this._enabled) {
			this
				._initializePopup()
				._map
					.on("mousemove", this._evt_trackPopup, this)
					.on("click", this._evt_onClick, this);
			this._enabled = true;
		}
		return this;
	},
	/**
	 * @private
	 */
	_disable : function() {
		this._map
			.off("mousemove", this._evt_trackPopup, this)
			.off("click", this._evt_onClick, this);
		this._enabled = false;
		return this;
	},
	/**
	 * @private
	 */
	_initializePopup :function() {
		this._popup = new L.Popup({
				className : "leaflet-comment"
			})
			.setContent(this._getInitialContent())
			.setLatLng(this._map.getCenter())
			.openOn(this._map);
		if (!this._id) {
			this._id = this.options.cookieStamp + (++CommentCounter);
		}
		return this;
	},
	/**
	 * @private
	 */
	_evt_onClick : function(evt) {
		var originalEvt = evt.originalEvent;
		L.DomEvent
			.preventDefault(originalEvt)
			.stopPropagation(originalEvt);
		this._map
			.off("mousemove", this._evt_trackPopup, this)
			.off("click", this._evt_onClick, this);
		this._popup.options.closeOnClick = false;
		this._popup.openOn(this._map);
		this._animatePopupDrop(evt.layerPoint, evt.latlng.lng, evt.latlng.lat, null, function() {
			this._popup.setContent(this._getEnabledContent());
		})._saveInCookie(this._getPopupProperties());
		return this;
	},
	/**
	 * @private
	 */
	_evt_trackPopup : function(evt) {
		return this._placePopup(evt.latlng);
	},
	/**
	 * @private
	 */
	_animatePopupDrop : function(pxpy, lngTarget, latTarget, currentLat, callback, step) {
		if (!currentLat) {
			currentLat = this._map.containerPointToLatLng(new L.Point(pxpy.x, pxpy.y - 8)).lat;
			step = (currentLat - latTarget) / 12;
			return this._animatePopupDrop(pxpy, lngTarget, latTarget, currentLat, callback, step);
		}
		currentLat = currentLat - step;
		if (currentLat !== latTarget && currentLat >= latTarget) {
			setTimeout(function(self) {
				self._popup.setLatLng([currentLat, lngTarget]);
				self._animatePopupDrop(pxpy, lngTarget, latTarget, currentLat, callback, step);
			}, 15, this);
		} else {
			this._popup.setLatLng([latTarget, lngTarget]);
			if (callback) {
				callback.call(this);
			}
		}
		return this;
	},
	/**
	 * @private
	 */
	_placePopup : function(latLng) {
		this._popup.setLatLng(latLng);
		return this;
	},
	/**
	 * @private
	 */
	_bindEventOnContainer : function(event, container) {
		var self = this;
		container.addEventListener(event, function(evt) {
			self._saveInCookie(self._getPopupProperties());
			if (self.options.onInput) {
				self.options.onInput.call(self, container.id, evt.target.value);
			}
		}, false);
		return container;
	},
	/**
	 * @private
	 */
	_getPopupProperties : function() {
		var props = {};
		L.Util.setOptions(props, this.options, {
			value : this._popup.getContent().value
		});
		return props;
	},
	/**
	 * @private
	 */
	_getInitialContent : function() {
		return this._getContent("div", this.options.onDragMessage);
	},
	/**
	 * @private
	 */
	_getEnabledContent : function() {
		var container = this._getContent("textarea", this.options.onClickPlaceholder);
		return this._bindEventOnContainer("input", container);
	},
	/**
	 * @private
	 */
	_getContent : function(elType, content, klass) {
		elType = elType || "div";
		klass  = klass  || "";
		var container = L.DomUtil.create(elType),
			prop      = elType === "textarea" ? "placeholder" : "innerHTML";
		container[prop] = content;
		container.id = this.options.cookieStamp + (++CommentCounter);
		container.className = klass;
		container.style.color = this.options.textColor;
		container.style.backgroundColor = this.options.backgroundColor;
		return container;
	},
	/**
	 * @private
	 */
	_initFromCookies : function() {
		if (this.options.useCookies) {
			/* todo */
		}
		return this;
	},
	/**
	 * @private
	 */
	_saveInCookie : function(value) {
		var expirationThreshold, date;
		if (this.options.useCookies) {
			value = typeof value === "object" ? JSON.stringify(value) : value;
			expirationThreshold = "";
			date = new Date();
			date.setTime(date.getTime() + (365 * 86400000)); // @todo handle number of days
			expirationThreshold = "; expires=" + date.toUTCString();
			document.cookie = this.options.cookieStamp + this._id + "=" + value + expirationThreshold + "; path=/";
		}
		return this;
	}
});

})();
