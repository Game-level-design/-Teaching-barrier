
var CurrentMap = {
	_width: 0,
	_height: 0,
	_divisionAreaArray: null,
	_isSkipMode: false,
	_preAttack: null,
	
	prepareMap: function() {
		this._width = root.getCurrentSession().getCurrentMapInfo().getMapWidth();
		this._height = root.getCurrentSession().getCurrentMapInfo().getMapHeight();
		
		// 援軍を登場させる際に意味を持つ
		this.prepareDivisionAreaArray();
		
		MapLayer.prepareMapLayer();
		
		MouseControl.prepareMouseControl();
		
		this.setTurnSkipMode(false);
		
		// マップ端への侵入が許可されていない場合
		if (!DataConfig.isMapEdgePassable()) {
			root.getCurrentSession().setMapBoundaryValue(1);
		}
	},
	
	getWidth: function() {
		return this._width;
	},
	
	getHeight: function() {
		return this._height;
	},
	
	getSize: function() {
		return this._width * this._height;
	},
	
	isMapInside: function(x, y) {
		if (x < 0 || x > this._width - 1) {
			return false;
		}
		
		if (y < 0 || y > this._height - 1) {
			return false;
		}
		
		return true;
	},
	
	getIndex: function(x, y) {
		if (!this.isMapInside(x, y)) {
			return -1;
		}
		
		return (y * this._width) + x;
	},
	
	getX: function(index) {
		return Math.floor(index % this._width);
	},
	
	getY: function(index) {
		return Math.floor(index / this._width);
	},
	
	getCol: function() {
		return Math.ceil(root.getGameAreaWidth() / GraphicsFormat.MAPCHIP_WIDTH);
	},
	
	getRow: function() {
		// 800 * 600時などは、高さを32で割り切れない。
		// この場面においては、数値を切り上げる。
		return Math.ceil(root.getGameAreaHeight() / GraphicsFormat.MAPCHIP_HEIGHT);
	},
	
	prepareDivisionAreaArray: function() {
		var x, y, xEnd, yEnd, divisionArea;
		var width = CurrentMap.getWidth();
		var height = CurrentMap.getHeight();
		
		this._divisionAreaArray = [];
		
		// マップが広い場合、援軍を一斉に表示させても、一部分に関しては見えないという事が起こる。
		// このため、マップの表示範囲を一定数に分割し、ReinforcementCheckerではその範囲内に援軍が入っているかを順に確認する。
		y = 0;
		yEnd = 0;
		for (; y < height;) {
			yEnd += this.getRow();
			if (yEnd > height) {
				yEnd = height;
			}
			
			x = 0;
			xEnd = 0;
			for (; x < width;) {
				xEnd += this.getCol();
				if (xEnd > width) {
					xEnd = width;
				}
				
				divisionArea = {};
				divisionArea.x = x;
				divisionArea.y = y;
				divisionArea.xEnd = xEnd;
				divisionArea.yEnd = yEnd;
				this._divisionAreaArray.push(divisionArea);
				
				x = xEnd;
			}
			y = yEnd;
		}
	},
	
	getDivisionAreaArray: function() {
		return this._divisionAreaArray;
	},
	
	setTurnSkipMode: function(isSkipMode) {
		this._isSkipMode = isSkipMode;
		root.setEventSkipMode(isSkipMode);
	},
	
	isTurnSkipMode: function() {
		return this._isSkipMode;
	},
	
	isCompleteSkipMode: function() {
		return this._isSkipMode || root.isEventSkipMode();
	},
	
	setPreAttackObject: function(preAttack) {
		this._preAttack = preAttack;
	},
	
	getPreAttackObject: function() {
		return this._preAttack;
	}
};

var MapLayer = {
	_counter: null,
	_unitRangePanel: null,
	_mapChipLight: null,
	_markingPanel: null,
	_effectRangeColor: 0,
	_effectRangeAlpha: 0,
	_effectRangeType: EffectRangeType.NONE,
	
	prepareMapLayer: function() {
		this._counter = createObject(UnitCounter);
		this._unitRangePanel = createObject(UnitRangePanel);
		
		this._mapChipLight = createObject(MapChipLight);
		this._mapChipLight.setLightType(MapLightType.NORMAL);
		
		this._markingPanel = createObject(MarkingPanel);
	},
	
	moveMapLayer: function() {
		this._counter.moveUnitCounter();
		this._unitRangePanel.moveRangePanel();
		this._mapChipLight.moveLight();
		this._markingPanel.moveMarkingPanel();
		CustomCharChipGroup.moveCustomCharChipGroup();
		
		return MoveResult.END;
	},
	
	drawMapLayer: function() {
		var session;
		
		session = root.getCurrentSession();
		if (session !== null) {
			session.drawMapSet(0, 0);
			if (EnvironmentControl.isMapGrid() && root.isSystemSettings(SystemSettingsType.MAPGRID)) {
				session.drawMapGrid(0x0, 64);
			}
		}
		else {
			root.getGraphicsManager().fill(0x0);
		}
		
		if (this._effectRangeType === EffectRangeType.MAP) {
			this._drawScreenColor();
		}
	},
	
	drawUnitLayer: function() {
		var index = this._counter.getAnimationIndex();
		var index2 = this._counter.getAnimationIndex2();
		var session = root.getCurrentSession();
		
		this._markingPanel.drawMarkingPanel();
		
		this._unitRangePanel.drawRangePanel();
		this._mapChipLight.drawLight();
		
		if (session !== null) {
			session.drawUnitSet(true, true, true, index, index2);
		}
		
		if (this._effectRangeType === EffectRangeType.MAPANDCHAR) {
			this._drawScreenColor();
		}
	},
	
	getAnimationIndexFromUnit: function(unit) {
		return this._counter.getAnimationIndexFromUnit(unit);
	},
	
	getUnitRangePanel: function() {
		return this._unitRangePanel;
	},
	
	getMapChipLight: function() {
		return this._mapChipLight;
	},
	
	getMarkingPanel: function() {
		return this._markingPanel;
	},
	
	setEffectRangeData: function(color, alpha, type) {
		this._effectRangeColor = color;
		this._effectRangeAlpha = alpha;
		this._effectRangeType = type;
	},
	
	_drawScreenColor: function() {
		var color = this._effectRangeColor;
		var alpha = this._effectRangeAlpha;
		
		root.getGraphicsManager().fillRange(0, 0, root.getGameAreaWidth(), root.getGameAreaHeight(), color, alpha);
	}
};

var MapView = {
	isVisible: function(x, y) {
		return this.isVisiblePixel(x * GraphicsFormat.MAPCHIP_WIDTH, y * GraphicsFormat.MAPCHIP_HEIGHT);
	},
	
	isVisiblePixel: function(xPixel, yPixel) {
		var session = root.getCurrentSession();
		var mx = session.getScrollPixelX();
		var my = session.getScrollPixelY();
		var width = root.getGameAreaWidth();
		var height = root.getGameAreaHeight();
		
		if (mx > xPixel || my > yPixel) {
			return false;
		}
		else if ((mx + width) <= xPixel || (my + height) <= yPixel) {
			return false;
		}
		
		return true;
	},
	
	setScroll: function(x, y) {
		return this.setScrollPixel(x * GraphicsFormat.MAPCHIP_WIDTH, y * GraphicsFormat.MAPCHIP_HEIGHT);
	},
	
	setScrollPixel: function(xPixel, yPixel) {
		var pos = this.getScrollPixelPos(xPixel, yPixel);
		var session = root.getCurrentSession();
		var xScrollPrev = session.getScrollPixelX();
		var yScrollPrev = session.getScrollPixelY();
		
		session.setScrollPixelX(pos.x);
		session.setScrollPixelY(pos.y);

		return xScrollPrev !== pos.x || yScrollPrev !== pos.y;
	},
	
	getScrollPixelPos: function(xPixel, yPixel) {
		var xScroll, yScroll;
		var maxWidth = CurrentMap.getWidth() * GraphicsFormat.MAPCHIP_WIDTH;
		var maxHeight = CurrentMap.getHeight() * GraphicsFormat.MAPCHIP_HEIGHT;
		var areaWidth = root.getGameAreaWidth();
		var areaHeight = root.getGameAreaHeight();
		
		xScroll = xPixel - Math.floor(areaWidth / 2);
		
		if (xScroll < 0) {
			xScroll = 0;
		}
		else if (xScroll > maxWidth - areaWidth) {
			xScroll = maxWidth - areaWidth;
		}
		
		yScroll = yPixel - Math.floor(areaHeight / 2);

		if (yScroll < 0) {
			yScroll = 0;
		}
		else if (yScroll > maxHeight - areaHeight) {
			yScroll = maxHeight - areaHeight;
		}
		
		return createPos(xScroll, yScroll);
	},
	
	// 後のバージョンで削除
	checkAndSetScroll: function(x, y) {
		var xPixel = x * GraphicsFormat.MAPCHIP_WIDTH;
		var yPixel = y * GraphicsFormat.MAPCHIP_HEIGHT;
		
		if (!MapView.isVisible(xPixel, yPixel)) {
			MapView.setScrollPixel(xPixel, yPixel);
		}
	},
	
	getScrollableData: function() {
		var isLeft = false;
		var isTop = false;
		var isRight = false;
		var isBottom = false;
		var session = root.getCurrentSession();
		var xScroll = session.getScrollPixelX();
		var yScroll = session.getScrollPixelY();
		var maxWidth = CurrentMap.getWidth() * GraphicsFormat.MAPCHIP_WIDTH;
		var maxHeight = CurrentMap.getHeight() * GraphicsFormat.MAPCHIP_HEIGHT;
		var areaWidth = root.getGameAreaWidth();
		var areaHeight = root.getGameAreaHeight();
		
		if (xScroll > 0) {
			isLeft = true;
		}
		
		if (xScroll < maxWidth - areaWidth) {
			isRight = true;
		}
		
		if (yScroll > 0) {
			isTop = true;	
		}
		
		if (yScroll < maxHeight - areaHeight) {
			isBottom = true;
		}
		
		return {
			isLeft: isLeft,
			isTop: isTop,
			isRight: isRight,
			isBottom: isBottom
		};
	},
	
	changeMapCursor: function(x, y) {
		var session = root.getCurrentSession();
		
		session.setMapCursorX(x);
		session.setMapCursorY(y);
		
		this.setScroll(x, y);
		MouseControl.changeCursorFromMap(x, y);
	}
};
