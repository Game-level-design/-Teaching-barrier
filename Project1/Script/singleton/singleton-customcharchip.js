
var CustomCharChipGroup = {
	_objectArray: null,
	
	initSingleton: function() {
		this._objectArray = [];
		this._configureCustomCharChip(this._objectArray);
	},
	
	moveCustomCharChipGroup: function() {
		var i;
		var count = this._objectArray.length;
		
		for (i = 0; i < count; i++) {
			this._objectArray[i].moveCustomCharChip();
		}
	},
	
	drawCustomCharChipGroup: function(cpData) {
		var i;
		var count = this._objectArray.length;
		
		for (i = 0; i < count; i++) {
			if (cpData.keyword === this._objectArray[i].getCustomCharChipKeyword()) {
				this._objectArray[i].drawCustomCharChip(cpData);
				break;
			}
		}
	},
	
	createCustomCharChipDataFromUnit: function(unit, xPixel, yPixel, unitRenderParam) {
		var cpData = {};
		var terrain = PosChecker.getTerrainFromPos(unit.getMapX(), unit.getMapY());
		
		cpData.xPixel = xPixel;
		cpData.yPixel = yPixel;
		cpData.unit = unit;
		cpData.cls = unit.getClass();
		cpData.terrain = terrain;
		cpData.animationIndex = unitRenderParam.animationIndex;
		cpData.direction = unitRenderParam.direction;
		cpData.alpha = unitRenderParam.alpha;
		cpData.unitType = unit.getUnitType();
		cpData.wait = unit.isWait();
		cpData.isHpVisible = false;
		cpData.isStateIcon = false;
		cpData.keyword = unit.getCustomCharChipKeyword();
		
		return cpData;
	},
	
	_configureCustomCharChip: function(groupArray) {
		groupArray.appendObject(CustomCharChip.Crystal);
	}
};

var BaseCustomCharChip = defineObject(BaseObject,
{
	initialize: function() {
	},
	
	moveCustomCharChip: function() {
		return MoveResult.CONTINUE;
	},
	
	drawCustomCharChip: function(cpData) {
	},
	
	getCustomCharChipKeyword: function() {
		return '';
	}
}
);

var CustomCharChip = {};

CustomCharChip.Crystal = defineObject(BaseCustomCharChip,
{
	moveCustomCharChip: function() {
		return MoveResult.CONTINUE;
	},
	
	drawCustomCharChip: function(cpData) {
		var pic = this._getPicture(cpData);
		var xSrc = this._getSrcX(cpData);
		var ySrc = this._getSrcY(cpData);
		var width = this._getWidth();
		var height = this._getHeight();
		var pos = this._getPos(cpData);
		
		if (pic === null) {
			return;
		}
		
		pic.setAlpha(cpData.alpha);
		pic.drawStretchParts(pos.x, pos.y, width, height, xSrc, ySrc, width, height);
		
		this._drawInfo(cpData, pos.x, pos.y);
	},
	
	getCustomCharChipKeyword: function() {
		return 'crystal';
	},
	
	_drawInfo: function(cpData, x, y) {
		if (cpData.isHpVisible) {
			root.drawCharChipHpGauge(x + 25, y + 45, cpData.unit);
		}
		
		if (cpData.isStateIcon) {
			root.drawCharChipStateIcon(x + 25, y + 15, cpData.unit);
		}
	},
	
	_getPicture: function(cpData) {
		var handle = root.queryGraphicsHandle('battlecrystal');
		return GraphicsRenderer.getGraphics(handle, GraphicsType.PICTURE);
	},
	
	_getPos: function(cpData) {
		var pos = createPos();
		
		pos.x = cpData.xPixel - Math.floor(this._getWidth() / 2) + 16;
		pos.y = cpData.yPixel - Math.floor(this._getHeight() / 2) + 16;
		
		return pos;
	},
	
	_getSrcX: function(cpData) {
		if (cpData.isWait) {
			return 3 * this._getWidth();
		}
		
		return cpData.unitType * this._getWidth();
	},
	
	_getSrcY: function(cpData) {
		return 0;
	},
	
	_getWidth: function() {
		return 84;
	},
	
	_getHeight: function() {
		return 84;
	}
}
);
