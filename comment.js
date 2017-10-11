(function() {
	
"use strict";	

/**
 * Public methods exposed by the L.Comment class
 */	
L.Comment = L.Class.extend({
	/**
	 * Default options for any L.Comment instance
	 * Pass an object with below keys to override
	 * these values upon creating a new instance
	 * @public
	 */
	options : {
		backgroundColor    : "white",
		textColor          : "black",
		onDragMessage      : "Click to drop me somewhere!",
		onClickPlaceholder : "What is interesting here?",
		useCookies         : true,
		cookieStamp        : "L-Comment-",
		onInput            : null,
	},
	/**
	 * Automatically called when initializing an instance
	 * @public
	 * @param {Object} opts - a set of options
	 * @return {L.Comment} the current instance
	 */
	initialize : function(opts) {
		L.Util.setOptions(this, opts);
		return this;
	},
	/**
	 * Add the instance to the map
	 * @public
	 * @param {L.Map} map - a leaflet map instance
	 * @return {L.Comment} the current instance
	 */
	addTo : function(map) {
		return this.onAdd(map);
	},
	/**
	 * Similar method as addTo
	 * @public
	 * @param {L.Map} map - a leaflet map instance
	 * @return {L.Comment} the current instance
	 */
	onAdd : function(map) {
		this._map = map;
		return this._enable();
	},
	/**
	 * Remove the current instance from the map
	 * @public
	 * @return {L.Comment} the current instance
	 */
	remove : function() {
		return this.removeFrom(this._map);
	},
	/**
	 * Remove the current instance from a given map
	 * The map passed explicitly as arguments
	 * as to be the same than the one passed
	 * in the addTo or onAdd methods
	 * @public
	 * @param {L.Map} map - a leaflet map instance
	 * @return {L.Comment} the current instance
	 */
	removeFrom : function(map) {
		if (map === this._map) {
			this._disable();
		}
		return this;
	},
	/**
	 * Get all the properties of the instance
	 * at a given time
	 * @public
	 * @return {Object} the properties of the instance
	 */
	getPopupProperties : function() {
		var props = {
			value : this._popup.getContent().value
		};
		L.Util.setOptions(props, this.options);
		return props;
	},
	/**
	 * Empty the cookies related to the L.Comment class
	 * @todo perhaps it should be a static method
	 * @public
	 * @return {L.Comment} the current instance
	 */
	clearCookieStorage : function() {
		var stamp = this.options.cookieStamp;
		document.cookie.split(/; */).forEach(function(cookie) {
			cookie = cookie.split("=")[0];
			if (cookie.indexOf(stamp) > -1) {
				document.cookie = cookie + "=; Max-Age=0";
			}
		}, this);
		return this;
	}
});

// Used to generate new unique ids for newly created instance
// Each newly instantiated L.Comment will augment this counter by one
var CommentCounter = 0;


/**
 * Private methods
 * You should not rely on the below methods
 * when manipulating a L.Comment instance
 */
L.Comment.include({
	/**
	 * Initialize a pop-up and bind
	 * its core events to the map
	 * @private
	 * @return {L.Comment} the current instance
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
	 * Remove a pop-up and unbind
	 * its core events from the map
	 * @private
	 * @return {L.Comment} the current instance
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
	 * Event handler for `click`
	 * Will drop the pop-up to the map
	 * @private
	 * @param {Event} evt - the event
	 * @return {L.Comment} the current instance
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
		})._saveInCookie(this.getPopupProperties());
		return this;
	},
	/**
	 * Event handler for `mousemove`
	 * Will reposition the pop-up
	 * where the mouse is currently located
	 * @private
	 * @param {Event} evt - the event
	 * @return {L.Comment} the current instance
	 */
	_evt_trackPopup : function(evt) {
		return this._placePopup(evt.latlng);
	},
	/**
	 * Animate the pop-up "fall"
	 * after a click occured on the map
	 * @todo perhaps some refactoring needed?
	 * @private
	 * @return {L.Comment} the current instance
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
	 * Position the pop-up on the map
	 * based on provided lat and lng values
	 * @private
	 * @param {L.LatLng} latLng - The latitude and longitude values to place the pop-up
	 * @return {L.Comment} the current instance
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
			self._saveInCookie(self.getPopupProperties());
			if (self.options.onInput) {
				self.options.onInput.call(self, container.id, evt.target.value);
			}
		}, false);
		return container;
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
		return this._bindEventOnContainer("input", this._getContent("textarea", this.options.onClickPlaceholder));
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
	 * Initialize an instance based on
	 * information retrieved from cookies
	 * /!\ Does not work when tested from a "file://" protocol
	 * @private
	 * @return {L.Comment} the current instance
	 */
	_initFromCookies : function() {
		if (this.options.useCookies) {
			/* todo */
		}
		return this;
	},
	/**
	 * Save the instance properties
	 * in the cookie storage
	 * /!\ Does not work when tested from a "file://" protocol
	 * @private
	 * @return {L.Comment} the current instance
	 */
	_saveInCookie : function(value) {
		var expirationThreshold, date;
		if (this.options.useCookies) {
			value = window.encodeURIComponent(typeof value === "object" ? JSON.stringify(value) : value);
			date = new Date();
			date.setTime(date.getTime() + (365 * 86400000)); // @todo handle number of days
			expirationThreshold = "; expires=" + date.toUTCString();
			document.cookie = this._id + "=" + value + expirationThreshold + "; path=/";
		}
		return this;
	}
});

})();
