
var MessagePager = defineObject(BaseObject,
{
	_color: 0,
	_font: null,
	_picUnderLine: null,
	_showCount: 0,
	_charHeight: 0,
	_spaceInterval: 0,
	_isScrollLocked: false,
	_colTitle: 0,
	_edgeCursor: null,
	_textIndex: 0,
	_textArray: null,
	_totalWidth: 0,
	_totalHeight: 0,
	
	setMessagePagerInfo: function(messagePagerParam) {
		var totalWidth;
		
		this._color = messagePagerParam.color;
		this._font = messagePagerParam.font;
		this._picUnderLine = messagePagerParam.picUnderLine;
		this._showCount = messagePagerParam.rowCount;
		this._charHeight = this._font.getSize();
		this._spaceInterval = messagePagerParam.interval;
		this._isScrollLocked = messagePagerParam.isScrollLocked;
		
		totalWidth = messagePagerParam.maxWidth;
		this._colTitle = Math.floor(totalWidth / TitleRenderer.getTitlePartsWidth()) - 2;
		
		this._totalWidth = totalWidth;
		this._totalHeight = ((this._showCount + 1) * this._charHeight) + (this._showCount * this._spaceInterval);
		this._edgeCursor = createObject(EdgeCursor);
		this._edgeCursor.setEdgeRange(this._totalWidth, this._totalHeight);
	},
	
	setMessagePagerText: function(text) {
		var i;
		var j = 0;
		var index = 0;
		var count = text.length;
		var textArray = [];
		
		for (i = 0; i < count; i++) {
			if (text.charAt(i) === '\n') {
				textArray[j] = text.substring(index, i);
				j++;
				index = i + 1;
			}
		}
		
		textArray[j] = text.substring(index, i);
		
		this._textArray = textArray;
		this._textIndex = 0;
	},
	
	moveMessagePager: function() {
		var inputType = InputControl.getDirectionState();
		
		if (inputType === InputType.UP || MouseControl.isInputAction(MouseType.UPWHEEL)) {
			if (this._isUp()) {
				this._textIndex -= this._showCount;
			}
		}
		else if (inputType === InputType.DOWN || MouseControl.isInputAction(MouseType.DOWNWHEEL)) {
			if (this._isDown()) {
				this._textIndex += this._showCount;
			}
		}
		
		this._edgeCursor.moveCursor();
		
		return MoveResult.CONTINUE;
	},
	
	drawMessagePager: function(x, y) {
		this._drawText(x, y);
		this._drawCursor(x, y);
	},
	
	getPagerWidth: function() {
		return this._totalWidth;
	},
	
	getPagerHeight: function() {
		return this._totalHeight;
	},
	
	_drawText: function(x, y) {
		var i, count;
		
		if (this._textIndex + this._showCount > this._textArray.length) {
			count = this._textArray.length;
		}
		else {
			count = this._textIndex + this._showCount;
		}
		
		for (i = this._textIndex; i < count; i++) {
			TitleRenderer.drawTitle(this._picUnderLine, x, y - 24, TitleRenderer.getTitlePartsWidth(), TitleRenderer.getTitlePartsHeight(), this._colTitle);
			TextRenderer.drawText(x, y, this._textArray[i], -1, this._color, this._font);	
			y += this._charHeight + this._spaceInterval;
		}
	},
	
	_drawCursor: function(x, y) {
		var isUp = this._isUp();
		var isDown = this._isDown();
		
		this._edgeCursor.drawVertCursor(x, y - 20, isUp, isDown);
	},
	
	_isUp: function() {
		if (this._isScrollLocked) {
			return false;
		}
		
		return this._textIndex - this._showCount >= 0;
	},
	
	_isDown: function() {
		if (this._isScrollLocked) {
			return false;
		}
		
		return this._textIndex + this._showCount < this._textArray.length;
	}
}
);

var HorizontalPageChanger = defineObject(BaseObject,
{
	_counter: null,
	_pageCount: 0,
	_activePageIndex: 0,
	_cursorIndex: 0,
	_totalWidth: 0,
	_totalHeight: 0,
	
	initialize: function() {
		this._counter = createObject(CycleCounter);
		this._counter.setCounterInfo(20);
		this._counter.disableGameAcceleration();
	},
	
	setPageData: function(pageCount, width, height) {
		this._activePageIndex = 0;
		this._pageCount = pageCount;
		this._totalWidth = width;
		this._totalHeight = height;
	},
	
	movePage: function() {
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			if (this._cursorIndex === 0) {
				this._cursorIndex = 1;
			}
			else {
				this._cursorIndex = 0;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawPage: function(x, y) {
		var range;
		
		// move系メソッドにて、座標をマウスで参照できるようにする
		this.xRendering = x;
		this.yRendering = y;
		
		range = this._getLeftRange(x, y);
		this._drawPageCursor(range, true);
		
		range = this._getRightRange(x, y);
		this._drawPageCursor(range, false);
	},
	
	checkPage: function() {
		var result = false;
		var xStart = this.xRendering;
		var yStart = this.yRendering;
		
		if (InputControl.isInputAction(InputType.LEFT)) {
			result = this._changePage(false);
		}
		else if (InputControl.isInputAction(InputType.RIGHT)) {
			result = this._changePage(true);
		}
		else if (root.isMouseAction(MouseType.LEFT)) {
			if (MouseControl.isHovering(this._getLeftRange(xStart, yStart))) {
				result = this._changePage(false);
			}
			else if (MouseControl.isHovering(this._getRightRange(xStart, yStart))) {
				result = this._changePage(true);
			}
		}
		
		return result;
	},
	
	getPageIndex: function() {
		return this._activePageIndex;
	},
	
	_drawPageCursor: function(range, isLeft) {
		var srcWidth = 32;
		var srcHeight = 32;
		var xSrc = this._cursorIndex * srcWidth;
		var ySrc = isLeft ? 0 : 64;
		var pic = this._getCursorUI();
		
		if (pic === null || this._pageCount <= 1) {
			return;
		}
		
		pic.drawParts(range.x, range.y, xSrc, ySrc, srcWidth, srcHeight);
	},
	
	_changePage: function(isNext) {
		var index = this._activePageIndex;
		var count = this._pageCount;
		
		if (isNext) {
			if (++index === count) {
				index = 0;
			}
		}
		else {
			if (--index === -1) {
				index = count - 1;
			}
		}
		
		this._activePageIndex = index;
		
		if (count > 1) {
			this._playMenuPageChangeSound();
			return true;
		}
		
		return false;
	},
	
	_getLeftRange: function(xStart, yStart) {
		var xHalf = 16;
		var yHalf = 16;
		var x = xStart - xHalf - xHalf;
		var y = Math.floor(((yStart + this._totalHeight) + yStart) / 2) - yHalf;
		
		return this._createEdgeRange(x, y);
	},
	
	_getRightRange: function(xStart, yStart) {
		var xHalf = 16;
		var yHalf = 16;
		var x = xStart + this._totalWidth - xHalf;
		var y = Math.floor(((yStart + this._totalHeight) + yStart) / 2) - yHalf;
		
		return this._createEdgeRange(x, y);
	},
	
	_createEdgeRange: function(x, y) {
		return createRangeObject(x, y, 32, 32);
	},
	
	_getCursorUI: function() {
		return root.queryUI('pagescrollcursor');
	},
	
	_playMenuPageChangeSound: function() {
		MediaControl.soundDirect('menutargetchange');
	}
}
);

var VerticalDataChanger = defineObject(BaseObject,
{	
	checkDataIndex: function(list, data) {
		var index = -1;
		
		if (InputControl.isInputAction(InputType.UP) || MouseControl.isInputAction(MouseType.UPWHEEL)) {
			index = this._changePage(list, data, false);
		}
		else if (InputControl.isInputAction(InputType.DOWN) || MouseControl.isInputAction(MouseType.DOWNWHEEL)) {
			index = this._changePage(list, data, true);
		}
		
		return index;
	},
	
	_changePage: function(list, data, isNext) {
		var i, count;
		var index = -1;
		
		if (data === null) {
			index = list.getIndex();
			count = list.getObjectCount();
		}
		else {
			count = list.getCount();
			for (i = 0; i < count; i++) {
				if (list.getData(i) === data) {
					index = i;
					break;
				}
			}
		}
		
		if (count === 1 || index === -1) {
			return -1;
		}
		
		if (isNext) {
			if (++index > count - 1) {
				index = 0;
			}
		}
		else {
			if (--index < 0) {
				index = count - 1;
			}
		}
		
		this._playMenuPageChangeSound();
		
		return index;
	},
	
	_playMenuPageChangeSound: function() {
		MediaControl.soundDirect('menutargetchange');
	}
}
);
