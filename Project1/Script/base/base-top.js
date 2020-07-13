
if (!Array.indexOf) {
	Array.prototype.indexOf = function(value) {
		var i;
		for (i in this) {
			if (this[i] === value) {
				return i;
			}
		}
		return -1;
	};
}

Array.prototype.appendObject = function(obj) {
	this.push(createObject(obj));
};

Array.prototype.insertObject = function(obj, index) {
	this.splice(index, 0, createObject(obj));
};

Array.prototype.appendWindowObject = function(obj, parentObject) {
	this.push(createWindowObject(obj, parentObject));
};

Array.prototype.insertWindowObject = function(obj, index, parentObject) {
	this.splice(index, 0, createWindowObject(obj, parentObject));
};

var createObject = function(o) {
	var F, n, i, len;
	var prop = 0;
	
	if (o === null) {
		return null;
	}
	
	F = function(){};
	F.prototype = o;
	n = new F();
	
	for (i = 1, len = arguments.length; i < len; ++i) {
		for (prop in arguments[i]) {
			n[prop] = arguments[i][prop];
		}
	}
	
	if (typeof n.initialize === 'function') {
		n.initialize();
	}
	
	if (typeof n._masterMode === 'undefined') {
		root.msg('object error');
	}
	
	return n;
};

var createObjectEx = function(o, parentObject) {
	var obj = createObject(o);
	
	if (obj === null) {
		return null;
	}
	
	obj._parentObject = parentObject;
	
	obj.getParentInstance = function() {
		return this._parentObject;
	};
	
	return obj;
};

// BaseScrollbarを継承したオブジェクトは、このオブジェクトで作成しなければならない
var createScrollbarObject = function(o, parentObject) {
	var obj = createObjectEx(o, parentObject);
	
	parentObject.getChildScrollbar = function() {
		return obj;
	};
	
	return obj;
};

// BaseWindowを継承したオブジェクトは、このオブジェクトで作成しなければならない
var createWindowObject = function(o, parentObject) {
	return createObjectEx(o, parentObject);
};

var createRangeObject = function(x, y, width, height) {
	return {
		x: x,
		y: y,
		width: width,
		height: height
	};
};

var isRangeIn = function(x, y, range) {
	if (x >= range.x && y >= range.y) {
		if (x <= range.x + range.width && y <= range.y + range.height) {
			return true;
		}
	}
	
	return false;
};

var createPos = function(x, y) {
	var obj = {};
	
	if (typeof x === 'undefined') {
		obj.x = -1;
	}
	else {
		obj.x = x;
	}
	
	if (typeof y === 'undefined') {
		obj.y = -1;
	}
	else {
		obj.y = y;
	}

	return obj;
};

var defineObject = function(o) {
	var F, n, i, len;
	var prop = 0;
	
	F = function(){};
	F.prototype = o;
	n = new F();
	
	for (i = 1, len = arguments.length; i < len; ++i) {
		for (prop in arguments[i]) {
			n[prop] = arguments[i][prop];
		}
	}
	
	return n;
};

var BaseObject = {
	_masterMode: 0,
	
	changeCycleMode: function(mode) {
		this._masterMode = mode;
	},
	
	getCycleMode: function() {
		return this._masterMode;
	}
};
