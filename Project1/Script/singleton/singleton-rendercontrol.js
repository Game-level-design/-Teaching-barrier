
// 左からrgb
var ColorValue = {
	DEFAULT: 0xffffff,
	KEYWORD: 0xf9f09d,
	INFO: 0x40bfff,
	DISABLE: 0x808080,
	LIGHT: 0x00ffff 
};

var TextFormat = {
	LEFT: 0,
	CENTER: 1,
	RIGHT: 2
};

var TextRenderer = {
	drawSingleCharacter: function(x, y, c, color, font) {
		root.getGraphicsManager().drawText(x, y, c, -1, color, 255, font);
	},
	
	drawText: function(x, y, text, length, color, font) {
		root.getGraphicsManager().drawText(x, y, text, length, color, 255, font);
	},
	
	drawRangeText: function(range, format, text, length, color, font) {
		root.getGraphicsManager().drawTextRange(range.x, range.y, range.width, range.height, format, text, length, color, 255, font);
	},
	
	drawAlphaText: function(x, y, text, length, color, alpha, font) {
		root.getGraphicsManager().drawText(x, y, text, length, color, alpha, font);
	},
	
	drawRangeAlphaText: function(range, format, text, length, color, alpha, font) {
		root.getGraphicsManager().drawTextRange(range.x, range.y, range.width, range.height, format, text, length, color, alpha, font);
	},
	
	// 文字の横に数字を描画する場合は、drawTextではなくこのメソッドを呼び出す
	drawKeywordText: function(x, y, text, length, color, font) {
		// テキストを数字に合せるため、5下げている
		this.drawText(x, y + 5, text, length, color, font);
	},
	
	drawSignText: function(x, y, text) {
		var font = this.getDefaultFont();
		
		this.drawKeywordText(x, y, text, -1, ColorValue.INFO, font);
	},
	
	// テキストの長さに応じた見出しを描画
	drawTitleText: function(x, y, text, color, font, format, pic) {
		var count = TitleRenderer.getTitlePartsCount(text, font);
		
		this.drawFixedTitleText(x, y, text, color, font, format, pic, count);
	},
	
	// 固定された長さの見出しを描画
	drawFixedTitleText: function(x, y, text, color, font, format, pic, count) {
		var range;
		var width = TitleRenderer.getTitlePartsWidth();
		var height = TitleRenderer.getTitlePartsHeight();
		
		if (pic !== null) {
			TitleRenderer.drawTitle(pic, x, y, width, height, count);
		}
		
		range = createRangeObject(x + width, y, width * count, height);
		this.drawRangeText(range, format, text, -1, color, font);
	},
	
	drawFixedTitleAlphaText: function(x, y, text, color, font, format, pic, alpha, count) {
		var range;
		var width = TitleRenderer.getTitlePartsWidth();
		var height = TitleRenderer.getTitlePartsHeight();
		
		if (pic !== null) {
			TitleRenderer.drawTitle(pic, x, y, width, height, count);
		}
		
		range = createRangeObject(x + width, y, (width * count), height);
		this.drawRangeAlphaText(range, format, text, -1, color, alpha, font);
	},
	
	drawScreenTopText: function(text, textui) {
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var y = 0;
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if (pic !== null) {	
			pic.draw(x, y);
			
			range = createRangeObject(x + 105, y, UIFormat.SCREENFRAME_WIDTH, 45);
			TextRenderer.drawRangeText(range, TextFormat.LEFT, text, -1, color, font);
		}
	},
	
	drawScreenTopTextCenter: function(text, textui) {
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var y = 0;
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if (pic !== null) {	
			pic.draw(x, y);
			
			range = createRangeObject(x, y, UIFormat.SCREENFRAME_WIDTH, 50);
			TextRenderer.drawRangeText(range, TextFormat.CENTER, text, -1, color, font);
		}
	},
	
	drawScreenBottomText: function(text, textui) {
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if (pic !== null) {
			pic.draw(x, root.getGameAreaHeight() - UIFormat.SCREENFRAME_HEIGHT);
			
			range = createRangeObject(x + 25, root.getGameAreaHeight() - 58, 600, 40);
			TextRenderer.drawRangeText(range, 1, text, -1, color, font);
		}
	},
	
	drawScreenBottomTextCenter: function(text, textui) {
		var range;
		var x = LayoutControl.getCenterX(-1, UIFormat.SCREENFRAME_WIDTH);
		var y = root.getGameAreaHeight() - UIFormat.SCREENFRAME_HEIGHT;
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if (pic !== null) {
			pic.draw(x, y);
			
			range = createRangeObject(x, y, UIFormat.SCREENFRAME_WIDTH, 110);
			TextRenderer.drawRangeText(range, TextFormat.CENTER, text, -1, color, font);
		}
	},
	
	getTextWidth: function(text, font) {
		return root.getGraphicsManager().getTextWidth(text, font);
	},
	
	getTextHeight: function(text, font) {
		return root.getGraphicsManager().getTextHeight(text, font);
	},
	
	getDefaultFont: function() {
		return root.getBaseData().getFontList().getData(0);
	}
};

var UnitRenderer = {
	// ウインドウなどにユニットを描画する目的で呼ばれる
	drawDefaultUnit: function(unit, x, y, unitRenderParam) {
		if (unitRenderParam === null) {
			unitRenderParam = StructureBuilder.buildUnitRenderParam();
		}
		
		this._setDefaultParam(unit, unitRenderParam);
		
		// ウインドウ上では常にデフォルト表示にしたい場合は、
		// this._drawCharChip(x, y, unitRenderParam);にしてもよい。
		this._drawCustomCharChip(unit, x, y, unitRenderParam);
	},
	
	// マップにユニットを描画する目的で呼ばれる
	drawScrollUnit: function(unit, x, y, unitRenderParam) {
		var session = root.getCurrentSession();
		var dx = 0;
		var dy = 0;
		
		if (unitRenderParam === null) {
			unitRenderParam = StructureBuilder.buildUnitRenderParam();
		}
		
		this._setDefaultParam(unit, unitRenderParam);
		
		if (unitRenderParam.isScroll) {
			dx = session.getScrollPixelX();
			dy = session.getScrollPixelY();
		}
		
		this._drawCustomCharChip(unit, x - dx, y - dy, unitRenderParam);
	},
	
	_drawCustomCharChip: function(unit, x, y, unitRenderParam) {
		var cpData, handle;
		var keyword = unit.getCustomCharChipKeyword();
		
		if (keyword !== '') {
			cpData = CustomCharChipGroup.createCustomCharChipDataFromUnit(unit, x, y, unitRenderParam);
			CustomCharChipGroup.drawCustomCharChipGroup(cpData);
		}
		else {
			handle = unit.getCustomCharChipHandle();
			if (handle !== null) {
				unitRenderParam.handle = handle;
			}
			
			this._drawCharChip(x, y, unitRenderParam);
		}
	},
	
	_drawCharChip: function(x, y, unitRenderParam) {
		var dx, dy;
		var directionArray = [4, 1, 2, 3, 0];
		var handle = unitRenderParam.handle;
		var width = GraphicsFormat.CHARCHIP_WIDTH;
		var height = GraphicsFormat.CHARCHIP_HEIGHT;
		var xSrc = handle.getSrcX() * (width * 3);
		var ySrc = handle.getSrcY() * (height * 5);
		var pic = this._getGraphics(handle, unitRenderParam.colorIndex);
		
		if (pic === null) {
			return;
		}
		
		dx = unitRenderParam.animationIndex;
		dy = directionArray[unitRenderParam.direction];
		
		pic.setAlpha(unitRenderParam.alpha);
		pic.setDegree(unitRenderParam.degree);
		pic.setReverse(unitRenderParam.isReverse);
		
		pic.drawStretchParts(x - 16, y - 16, width, height, xSrc + (dx * width), ySrc + (dy * height), width, height);
	},
	
	_setDefaultParam: function(unit, unitRenderParam) {
		if (unitRenderParam.colorIndex === -1) {
			unitRenderParam.colorIndex = unit.getUnitType();
		}
		
		if (unitRenderParam.handle === null) {
			unitRenderParam.handle = unit.getCharChipResourceHandle();
		}
	},
	
	_getGraphics: function(handle, colorIndex) {
		var isRuntime, list;
		var handleType = handle.getHandleType();
		
		if (handleType === ResourceHandleType.ORIGINAL) {
			isRuntime = false;
		}
		else if (handleType === ResourceHandleType.RUNTIME) {
			isRuntime = true;
		}
		else {
			return null;
		}
		
		list = root.getBaseData().getGraphicsResourceList(GraphicsType.CHARCHIP, isRuntime);
		
		return list.getCollectionDataFromId(handle.getResourceId(), colorIndex);
	}
};

// 後のバージョンで削除
var UnitClassRenderer = {
	drawDefaultUnit: function(unit, x, y, graphicsRenderParam) {	
		this.drawClass(unit.getClass(), x, y, 1, DirectionType.NULL, unit.getUnitType(), graphicsRenderParam);
	},
	
	drawScrollUnit: function(unit, x, y, animationIndex, direction, colorIndex, graphicsRenderParam) {
		var session = root.getCurrentSession();
		
		this.drawClass(unit.getClass(), x - session.getScrollPixelX(), y - session.getScrollPixelY(), animationIndex, direction, colorIndex, graphicsRenderParam);
	},
	
	drawClass: function(cls, x, y, animationIndex, direction, colorIndex, graphicsRenderParam) {
		var dx, dy;
		var directionArray = [4, 1, 2, 3, 0];
		var handle = cls.getCharChipResourceHandle();
		var pic = this._getGraphics(handle, colorIndex);
		var xSrc = handle.getSrcX();
		var ySrc = handle.getSrcY();
		var width = GraphicsFormat.CHARCHIP_WIDTH;
		var height = GraphicsFormat.CHARCHIP_HEIGHT;
		
		if (pic !== null) {
			dx = animationIndex;
			dy = directionArray[direction];
			
			if (graphicsRenderParam !== null) {
				if (graphicsRenderParam.alpha !== 255) {
					pic.setAlpha(graphicsRenderParam.alpha);
				}
				
				if (graphicsRenderParam.isReverse) {
					pic.setReverse(graphicsRenderParam.isReverse);
				}
				
				if (graphicsRenderParam.degree !== 0) {
					pic.setDegree(graphicsRenderParam.degree);
				}
			}
			
			pic.drawStretchParts(x - 16, y - 16, width, height, (xSrc + dx) * width, (ySrc + dy) * height, width, height);
		}
	},
	
	drawClassAndUnitNameVert: function(unit, x, y, text, length, color, font, graphicsRenderParam) {
		var range;
		
		this.drawDefaultUnit(unit, x, y, graphicsRenderParam);
		
		range = createRangeObject(x - 50, y + 30, length, 40);
		TextRenderer.drawRangeText(range, TextFormat.CENTER, text, length, color, font, graphicsRenderParam);
	},
	
	_getGraphics: function(handle, colorIndex) {
		var isRuntime, list;
		var handleType = handle.getHandleType();
		
		if (handleType === ResourceHandleType.ORIGINAL) {
			isRuntime = false;
		}
		else if (handleType === ResourceHandleType.RUNTIME) {
			isRuntime = true;
		}
		else {
			return null;
		}
		
		list = root.getBaseData().getGraphicsResourceList(GraphicsType.CHARCHIP, isRuntime);
		
		return list.getCollectionDataFromId(handle.getResourceId(), colorIndex);
	}
};

var UnitSimpleRenderer = {
	drawContent: function(x, y, unit, textui) {
		this._drawFace(x, y, unit, textui);
		this._drawName(x, y, unit, textui);
		this._drawInfo(x, y, unit, textui);
		this._drawSubInfo(x, y, unit, textui);
	},
	
	_drawFace: function(x, y, unit, textui) {
		ContentRenderer.drawUnitFace(x, y, unit, false, 255);
	},
	
	_drawName: function(x, y, unit, textui) {
		var length = this._getTextLength();
		var color = textui.getColor();
		var font = textui.getFont();
		
		x += GraphicsFormat.FACE_WIDTH + this._getInterval();
		y += 10;
		TextRenderer.drawText(x, y, unit.getName(), length, color, font);
	},
	
	_drawInfo: function(x, y, unit, textui) {
		var length = this._getTextLength();
		var color = textui.getColor();
		var font = textui.getFont();
		
		x += GraphicsFormat.FACE_WIDTH + this._getInterval();
		y += 40;
		TextRenderer.drawText(x, y, unit.getClass().getName(), length, color, font);
	},
	
	_drawSubInfo: function(x, y, unit, textui) {
		var pic = root.queryUI('unit_gauge');
		
		x += GraphicsFormat.FACE_WIDTH + this._getInterval();
		y += 60;
		ContentRenderer.drawUnitHpZone(x, y, unit, pic);
	},
	
	_getTextLength: function() {
		return ItemRenderer.getItemWindowWidth() - (GraphicsFormat.FACE_WIDTH + this._getInterval() + DefineControl.getWindowXPadding());
	},
	
	_getInterval: function() {
		return 10;
	}
};

// GraphicsRendererのメソッドに指定するハンドルは、queryGraphicsHandleで取得する。
// queryGraphicsHandleが画像そのものではなくハンドルを返すのは、
// 画像の描画には描画元情報が必要になるためである。
// たとえば、アイコン画像だけではどの箇所のアイコンを描画すればよいかまでは分からないため、
// そうした情報を含むことができるハンドルを返している。
// ただし、背景のように描画元の概念がない画像は、GraphicsRendererは使用しないこともある。
// UIは全ての種類で描画元の概念がないため、queryUIは画像そのものを返している。
// このため、UIの描画ではGraphicsRendererを使用しない。
var GraphicsRenderer = {
	drawImage: function(xDest, yDest, handle, graphicsType) {
		this.drawImageParam(xDest, yDest, handle, graphicsType, null);
	},
	
	drawImageParam: function(xDest, yDest, handle, graphicsType, graphicsRenderParam) {
		var pic = this.getGraphics(handle, graphicsType);
		var xSrc = handle.getSrcX();
		var ySrc = handle.getSrcY();
		var size = this.getGraphicsSize(graphicsType, pic);
		var width = size.width;
		var height = size.height;
		
		if (pic !== null) {
			if (graphicsRenderParam !== null) {
				if (graphicsRenderParam.alpha !== 255) {
					pic.setAlpha(graphicsRenderParam.alpha);
				}
				
				if (graphicsRenderParam.isReverse) {
					pic.setReverse(graphicsRenderParam.isReverse);
				}
				
				if (graphicsRenderParam.degree !== 0) {
					pic.setDegree(graphicsRenderParam.degree);
				}
			}
			
			pic.drawStretchParts(xDest, yDest, width, height, xSrc * width, ySrc * height, width, height);
		}
	},
	
	getGraphics: function(handle, graphicsType) {
		var isRuntime, list;
		var handleType = handle.getHandleType();
		
		if (handleType === ResourceHandleType.ORIGINAL) {
			isRuntime = false;
		}
		else if (handleType === ResourceHandleType.RUNTIME) {
			isRuntime = true;
		}
		else {
			return null;
		}
		
		list = root.getBaseData().getGraphicsResourceList(graphicsType, isRuntime);
		
		return list.getCollectionDataFromId(handle.getResourceId(), handle.getColorIndex());
	},
	
	getGraphicsSize: function(graphicsType, pic) {
		var width, height;
		
		if (graphicsType === GraphicsType.MAPCHIP) {
			width = GraphicsFormat.MAPCHIP_WIDTH;
			height = GraphicsFormat.MAPCHIP_HEIGHT;
		}
		else if (graphicsType === GraphicsType.CHARCHIP) {
			width = GraphicsFormat.CHARCHIP_WIDTH;
			height = GraphicsFormat.CHARCHIP_HEIGHT;
		}
		else if (graphicsType === GraphicsType.FACE) {
			width = GraphicsFormat.FACE_WIDTH;
			height = GraphicsFormat.FACE_HEIGHT;
		}
		else if (graphicsType === GraphicsType.ICON) {
			width = GraphicsFormat.ICON_WIDTH;
			height = GraphicsFormat.ICON_HEIGHT;
		}
		else if (graphicsType === GraphicsType.MOTION) {
			width = GraphicsFormat.MOTION_WIDTH;
			height = GraphicsFormat.MOTION_HEIGHT;
		}
		else if (graphicsType === GraphicsType.EFFECT) {
			width = GraphicsFormat.EFFECT_WIDTH;
			height = GraphicsFormat.EFFECT_HEIGHT;
		}
		else if (graphicsType === GraphicsType.WEAPON) {
			width = GraphicsFormat.WEAPON_WIDTH;
			height = GraphicsFormat.WEAPON_HEIGHT;
		}
		else if (graphicsType === GraphicsType.BOW) {
			width = GraphicsFormat.BOW_WIDTH;
			height = GraphicsFormat.BOW_HEIGHT;
		}
		else if (graphicsType === GraphicsType.THUMBNAIL) {
			width = GraphicsFormat.THUMBNAIL_WIDTH;
			height = GraphicsFormat.THUMBNAIL_HEIGHT;
		}
		else if (graphicsType === GraphicsType.BATTLEBACK) {
			width = GraphicsFormat.BATTLEBACK_WIDTH;
			height = GraphicsFormat.BATTLEBACK_HEIGHT;
		}
		else if (graphicsType === GraphicsType.EVENTBACK) {
			width = GraphicsFormat.EVENTBACK_WIDTH;
			height = GraphicsFormat.EVENTBACK_HEIGHT;
		}
		else if (graphicsType === GraphicsType.SCREENBACK) {
			width = GraphicsFormat.SCREENBACK_WIDTH;
			height = GraphicsFormat.SCREENBACK_HEIGHT;
		}
		else if (graphicsType === GraphicsType.WORLDMAP) {
			width = GraphicsFormat.WORLDMAP_WIDTH;
			height = GraphicsFormat.WORLDMAP_HEIGHT;
		}
		else if (graphicsType === GraphicsType.EVENTSTILL) {
			width = GraphicsFormat.EVENTSTILL_WIDTH;
			height = GraphicsFormat.EVENTSTILL_HEIGHT;
		}
		else if (graphicsType === GraphicsType.CHARILLUST) {
			width = GraphicsFormat.CHARILLUST_WIDTH;
			height = GraphicsFormat.CHARILLUST_HEIGHT;
		}
		else if (graphicsType === GraphicsType.PICTURE) {
			width = GraphicsFormat.PICTURE_WIDTH;
			height = GraphicsFormat.PICTURE_HEIGHT;
		}
		else {
			width = 0;
			height = 0;
		}
		
		if (pic !== null) {
			if (graphicsType === GraphicsType.BATTLEBACK || graphicsType === GraphicsType.EVENTBACK || graphicsType === GraphicsType.SCREENBACK ||
				graphicsType === GraphicsType.WORLDMAP || graphicsType === GraphicsType.EVENTSTILL || graphicsType === GraphicsType.CHARILLUST ||
				graphicsType === GraphicsType.PICTURE) {
				width = pic.getWidth();
				height = pic.getHeight();
			}
		}
		
		return {
			width: width,
			height: height
		};
	}
};

var ItemRenderer = {
	drawItem: function(x, y, item, color, font, isDrawLimit) {
		var interval = this._getItemNumberInterval();
		var iconWidth = GraphicsFormat.ICON_WIDTH + 5;
		var length = this._getTextLength();
		var handle = item.getIconResourceHandle();
		
		GraphicsRenderer.drawImage(x, y, handle, GraphicsType.ICON);
		
		TextRenderer.drawKeywordText(x + iconWidth, y, item.getName(), length, color, font);
		
		if (isDrawLimit) {
			if (this._isInfinity(item)) {
				return;
			}
			
			x = x + iconWidth + interval;
			if (item.getLimit() > 0) {
				NumberRenderer.drawNumber(x, y, item.getLimit());
			}
			else {
				// アイテムの耐久が0の場合は文字を描画する
				TextRenderer.drawSignText(x - 5, y, StringTable.SignWord_Limitless);
			}
		}
	},
	
	drawItemAlpha: function(x, y, item, color, font, isDrawLimit, alpha) {
		var interval = this._getItemNumberInterval();
		var width = GraphicsFormat.ICON_WIDTH + 5;
		var length = this._getTextLength();
		var handle = item.getIconResourceHandle();
		var graphicsRenderParam = StructureBuilder.buildGraphicsRenderParam();
		
		graphicsRenderParam.alpha = alpha;
		GraphicsRenderer.drawImageParam(x, y, handle, GraphicsType.ICON, graphicsRenderParam);
		
		TextRenderer.drawAlphaText(x + width, y + 5, item.getName(), length, color, alpha, font);
		
		if (isDrawLimit) {
			if (this._isInfinity(item)) {
				return;
			}
			
			x = x + width + interval;
			if (item.getLimit() > 0) {
				NumberRenderer.drawNumberColor(x, y, item.getLimit(), 0, alpha);
			}
			else {
				TextRenderer.drawSignText(x - 5, y, StringTable.SignWord_Limitless);
			}
		}
	},
	
	// アイテムとゴールドを描画する
	drawItemGold: function(x, y, item, color, font, gold) {
		var interval = this._getItemNumberInterval();
		var width = GraphicsFormat.ICON_WIDTH + 5;
		
		this.drawItem(x, y, item, color, font, true);
		
		x = x + width + interval + 65;
		NumberRenderer.drawNumber(x, y, gold);
	},
	
	getItemWidth: function() {
		return 220;
	},
	
	getItemWindowWidth: function() {
		return this.getItemWidth() + (DefineControl.getWindowXPadding() * 2);
	},
	
	getItemGoldWidth: function() {
		return 275;
	},
	
	getItemHeight: function() {
		return 30;
	},
	
	_getItemNumberInterval: function() {
		return this.getItemWidth() - 55;
	},
	
	_getTextLength: function() {
		return this._getItemNumberInterval();
	},
	
	_isInfinity: function(item) {
		return item.isWeapon() && DataConfig.isWeaponInfinity();
	}
};

var TitleRenderer = {
	drawTitle: function(pic, x, y, width, height, count) {
		var picCache, graphicsManager;
		
		if (pic === null) {
			return;
		}
		
		picCache = CacheControl.getCacheGraphics(width * (count + 2), height, pic);
		if (picCache !== null) {
			if (picCache.isCacheAvailable()) {
				// キャッシュの中身が有効な場合は、キャッシュを描画する
				picCache.draw(x, y);
				return;
			}
		}
		else {
			picCache = CacheControl.createCacheGraphics(width * (count + 2), height, pic);
		}
		
		graphicsManager = root.getGraphicsManager();
		
		// 描画対象を画面ではなくキャッシュに変更する
		graphicsManager.setRenderCache(picCache);
		
		// 見出しはキャッシュに描画される
		this._drawTitleInternal(pic, 0, 0, width, height, count);
		
		// キャッシュへの描画を無効にする
		graphicsManager.resetRenderCache();
		
		// キャッシュの中身が画面に描画される
		picCache.draw(x, y);
	},
	
	drawTitleNoCache: function(pic, x, y, width, height, count) {
		this._drawTitleInternal(pic, x, y, width, height, count);
	},
	
	drawLine: function(x, y, width, pic) {
		var w = UIFormat.LINE_WIDTH / 3;
		var h = UIFormat.LINE_HEIGHT / 4;
		
		this._drawLineInternal(pic, x, y, w, h, width / 8);
	},
	
	getTitlePartsCount: function(text, font) {
		var textWidth = TextRenderer.getTextWidth(text, font);
		var count = Math.floor(textWidth / TitleRenderer.getTitlePartsWidth()) + 1;
		
		return count;
	},
	
	getTitlePartsWidth: function() {
		return UIFormat.TITLE_WIDTH / 3;
	},
	
	getTitlePartsHeight: function() {
		return UIFormat.TITLE_HEIGHT;
	},
	
	_drawTitleInternal: function(pic, x, y, width, height, count) {
		var i;
		
		if (pic === null) {
			return;
		}
		
		// 左端の描画
		pic.drawParts(x, y, 0, 0, width, height);
		x += width;
		
		for (i = 0; i < count; i++) {
			pic.drawParts(x, y, width, 0, width, height);
			x += width;
		}
		
		// 右端の描画
		pic.drawParts(x, y, width * 2, 0, width, height);
	},
	
	_drawLineInternal: function(pic, x, y, width, height, count) {
		var i;
		var ySrc = 8 * 1;
		
		if (pic === null) {
			return;
		}
		
		// 左端の描画
		pic.drawParts(x, y, 0, ySrc, width, height);
		x += width;
		
		for (i = 0; i < count; i++) {
			pic.drawParts(x, y, width, ySrc, width, height);
			x += width;
		}
		
		// 右端の描画
		pic.drawParts(x, y, width * 2, ySrc, width, height);
	}
};

// HPなどの描画を管理する
var ContentRenderer = {
	drawLevelInfo: function(x, y, unit) {
		var textLv = StringTable.Status_Level;
		var textExp = StringTable.Status_Experience;
		var dx = [0, 44, 60, 98];
		var exp = unit.getExp();
		
		// ユニットが敵な場合は、ユーザー拡張で「敵撃破時の経験値をクラスの追加経験値にする」が設定されているか調べる
		if (unit.getUnitType() === UnitType.ENEMY && DataConfig.isFixedExperience()) {
			exp = unit.getClass().getBonusExp();
			if (exp < 0) {
				exp = 0;
			}
		}
		
		TextRenderer.drawSignText(x + dx[0], y, textLv);
		NumberRenderer.drawNumber(x + dx[1], y, unit.getLv());
		TextRenderer.drawSignText(x + dx[2], y, textExp);
		NumberRenderer.drawNumber(x + dx[3], y, exp);
	},
	
	drawHp: function(x, y, hp, maxHp) {
		var textHp = this._getHpText();
		var textSlash = '/';
		var dx = [0, 44, 60, 98];
		
		TextRenderer.drawSignText(x + dx[0], y, textHp);
		NumberRenderer.drawNumber(x + dx[1], y, hp);
		TextRenderer.drawSignText(x + dx[2], y, textSlash);
		NumberRenderer.drawNumber(x + dx[3], y, maxHp);
	},
	
	drawUnitHpZone: function(x, y, unit, pic) {
		var hp = unit.getHp();
		var mhp = ParamBonus.getMhp(unit);
		
		this.drawHp(x, y, hp, mhp);
		
		y += 20;
		this.drawGauge(x, y, hp, mhp, 1, 110, pic);
	},
	
	drawPlayTime: function(x, y, time) {
		var i;
		var arr = [,,];
		var count = arr.length;
		var dx = 8;
		var font = TextRenderer.getDefaultFont();
		
		arr[0] = Math.floor(time / 3600);
		arr[1] = Math.floor((time / 60) % 60);
		arr[2] = time % 60;
		
		for (i = 0; i < count; i++) {
			NumberRenderer.drawNumber(x, y, arr[i] / 10);
			NumberRenderer.drawNumber(x + dx, y, arr[i] % 10);
			
			x += 16;
			
			if (i < count - 1) {
				TextRenderer.drawText(x, y + 5, ':', -1, ColorValue.DEFAULT, font);
				x += dx;
			}
		}
	},
	
	drawGauge: function(x, y, curValue, maxValue, colorIndex, totalWidth, pic) {
		var i, n, per, full;
		var width = UIFormat.GAUGE_WIDTH / 3;
		var height = UIFormat.GAUGE_HEIGHT / 4;
		var max = totalWidth / 10;
		
		if (pic === null) {
			return;
		}
		
		per = ((curValue / maxValue) * max);
		
		if (per > 0 && per < 1) {
			per = 0;
		}
		else {
			// perは1より大きい。
			// ゼロベースにするため、1減算する。
			per -= 1;
		}
		
		for (i = 0; i < max; i++) {
			if (i === 0) {
				n = 0;
			}
			else if (i === max - 1) {
				n = 2;
			}
			else {
				n = 1;
			}
			
			if (per >= i) {
				full = colorIndex;
			}
			else {
				full = 0;
			}
		
			pic.drawParts(x + (i * width), y, n * width, full * height, width, height);
		}
	},
	
	// 96×96に収まる範囲で顔画像を描画する目的で呼ばれる。
	// リアル戦闘やユニットメニューの顔画像表示は、UIの関係上96×96で描画しなければならない。
	// メッセージレイアウトの「大きい顔画像を使用する」は無視する。
	drawUnitFace: function(x, y, unit, isReverse, alpha) {
		var handle = unit.getFaceResourceHandle();
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.FACE);
		
		if (pic === null) {
			return;
		}
		
		pic.setReverse(isReverse);
		pic.setAlpha(alpha);
		
		this._drawShrinkFace(x, y, handle, pic);
	},
	
	drawFaceFromResourceHandle: function(x, y, handle) {
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.FACE);
		
		if (pic === null) {
			return;
		}
		
		this._drawShrinkFace(x, y, handle, pic);
	},
	
	_drawShrinkFace: function(xDest, yDest, handle, pic) {
		var xSrc, ySrc;
		var destWidth = GraphicsFormat.FACE_WIDTH;
		var destHeight = GraphicsFormat.FACE_HEIGHT;
		var srcWidth = destWidth;
		var srcHeight = destHeight;
		
		if (root.isLargeFaceUse() && pic.isLargeImage()) {
			srcWidth = root.getLargeFaceWidth();
			srcHeight = root.getLargeFaceHeight();
		}
		
		xSrc = handle.getSrcX() * srcWidth;
		ySrc = handle.getSrcY() * srcHeight;
		pic.drawStretchParts(xDest, yDest, destWidth, destHeight, xSrc, ySrc, srcWidth, srcHeight);
	},
	
	_getHpText: function() {
		return root.queryCommand('hp_param');
	}
};

var StatusRenderer = {
	drawAttackStatus: function(x, y, arr, color, font, space) {
		var i, text;
		var length = this._getTextLength();
		var numberSpace = DefineControl.getNumberSpace();
		var buf = ['attack_capacity', 'hit_capacity', 'critical_capacity'];
		
		for (i = 0; i < 3; i++) {
			text = root.queryCommand(buf[i]);
			TextRenderer.drawKeywordText(x, y, text, length, color, font);
			x += 28 + numberSpace;
			
			if (arr[i] >= 0) {
				NumberRenderer.drawNumber(x, y, arr[i]);
			}
			else {
				TextRenderer.drawSignText(x - 5, y, StringTable.SignWord_Limitless);
			}
			
			x += space;
		}	
	},
	
	_getTextLength: function() {
		return 35;
	}
};

// 数字の描画を管理する。
// マイナスの数字を描画する場合は、呼び出し側が-を描画し、numberはプラスの値を指定する。
var NumberRenderer = {
	drawNumber: function(x, y, number) {
		this.drawNumberColor(x, y, number, 0, 255);
	},
	
	drawNumberColor: function(x, y, number, colorIndex, alpha) {
		var pic = root.queryUI('number');
		var width = UIFormat.NUMBER_WIDTH / 10;
		var height = UIFormat.NUMBER_HEIGHT / 5;
		var ySrc = height * colorIndex;
		
		this._drawNumberInternal(x, y, number, pic, ySrc, width, height, alpha);
	},
	
	drawRightNumber: function(x, y, number) {
		this.drawRightNumberColor(x, y, number, 0, 255);
	},
	
	drawRightNumberColor: function(x, y, number, colorIndex, alpha) {
		var pic = root.queryUI('number');
		var width = UIFormat.NUMBER_WIDTH / 10;
		var height = UIFormat.NUMBER_HEIGHT / 5;
		var ySrc = height * colorIndex;
		
		this._drawRightNumberInternal(x, y, number, pic, ySrc, width, height, alpha);
	},
	
	drawAttackNumber: function(x, y, number) {
		this.drawAttackNumberColor(x, y, number, 0, 255);
	},
	
	drawAttackNumberColor: function(x, y, number, colorIndex, alpha) {
		var pic = root.queryUI('bignumber');
		var width = UIFormat.BIGNUMBER_WIDTH / 10;
		var height = UIFormat.BIGNUMBER_HEIGHT / 5;
		var ySrc = height * colorIndex;
		
		this._drawAttackNumberInternal(x, y, number, pic, ySrc, width, height, alpha);
	},
	
	drawAttackNumberCenter: function(x, y, number) {
		var dx;
		
		if (number >= 1000) {
			dx = 32;
		}
		else if (number >= 100) {
			dx = 24;
		}
		else if (number >= 10) {
			dx = 16;
		}
		else {
			dx = 8;
		}
		
		this.drawAttackNumber(x - dx, y, number);
	},
	
	_drawNumberInternal: function(x, y, number, pic, ySrc, width, height, alpha) {
		var i, n;
		var count = 0;
		var digitArray = [];
		
		if (pic === null || number < 0) {
			return;
		}
		
		if (number === 0) {
			pic.drawParts(x, y, 0, ySrc, width, height);
			return;
		}
		
		while (number > 0) {
			n = Math.floor(number % 10);
			number = Math.floor(number / 10);
			digitArray[count] = n;
			count++;
		}
		
		for (i = 0; i < count; i++) {
			pic.setAlpha(alpha);
			pic.drawParts(x, y, digitArray[i] * width, ySrc, width, height);
			x -= 9;
		}
	},
	
	_drawRightNumberInternal: function(x, y, number, pic, ySrc, width, height, alpha) {
		var i, n;
		var count = 0;
		var digitArray = [];
		
		if (pic === null || number < 0) {
			return;
		}
		
		if (number === 0) {
			pic.drawParts(x, y, 0, ySrc, width, height);
			return;
		}
		
		while (number > 0) {
			n = Math.floor(number % 10);
			number = Math.floor(number / 10);
			digitArray[count] = n;
			count++;
		}
		
		for (i = count - 1; i >= 0; i--) {
			pic.setAlpha(alpha);
			pic.drawParts(x, y, digitArray[i] * width, ySrc, width, height);
			x += 9;
		}
	},
	
	_drawAttackNumberInternal: function(x, y, number, pic, ySrc, width, height, alpha) {
		var i, n;
		var count = 0;
		var digitArray = [];
		
		if (pic === null || number < 0) {
			return;
		}
		
		if (number === 0) {
			pic.drawParts(x, y, 0, ySrc, width, height);
			return;
		}
		
		while (number > 0) {
			n = Math.floor(number % 10);
			number = Math.floor(number / 10);
			digitArray[count] = n;
			count++;
		}
		
		for (i = count - 1; i >= 0; i--) {
			pic.setAlpha(alpha);
			pic.drawParts(x, y, digitArray[i] * width, ySrc, width, height);
			x += 15;
		}
	}
};

var SkillRenderer = {
	drawSkill: function(x, y, skill, color, font) {
		var handle = skill.getIconResourceHandle();
		var length = this._getTextLength();
		
		GraphicsRenderer.drawImage(x, y, handle, GraphicsType.ICON);
		x += 30;
		
		TextRenderer.drawKeywordText(x, y, skill.getName(), length, color, font);
	},
	
	drawTitle: function(x, y, color, font, pic) {
		TextRenderer.drawTitleText(x, y, 'skill list', color, font, TextFormat.CENTER, pic);
	},
	
	drawObjectSkillList: function(x, y, obj) {
		var i, data, handle;
		var list = obj.getSkillReferenceList();
		var count = list.getTypeCount();
		
		for (i = 0; i < count; i++) {
			data = list.getTypeData(i);
			handle = data.getIconResourceHandle();
			GraphicsRenderer.drawImage(x + (i * 30), y, handle, GraphicsType.ICON);
		}
	},
	
	_getTextLength: function() {
		return -1;
	}
};

// 後のバージョンで削除
var SkillGroupRenderer = {
	drawTitle: function(x, y, color, font, pic) {
		SkillRenderer.drawTitle(x, y, color, font, pic);
	},
	
	drawObjectSkillList: function(x, y, obj) {
		SkillRenderer.drawObjectSkillList(x, y, obj);
	}
};

var WeaponTypeRenderer = {
	drawTitle: function(x, y, color, font, pic) {
		TextRenderer.drawTitleText(x, y, 'weapon list', color, font, TextFormat.CENTER, pic);
	},
	
	drawClassWeaponList: function(x, y, cls) {
		var i, data, handle;
		var list = cls.getEquipmentWeaponTypeReferenceList();
		var count = list.getTypeCount();
		
		for (i = 0; i < count; i++) {
			data = list.getTypeData(i);
			handle = data.getIconResourceHandle();
			GraphicsRenderer.drawImage(x + (i * 30), y, handle, GraphicsType.ICON);
		}
		
		if (cls.getClassOption() & ClassOptionFlag.WAND) {
			handle = this._getWandIcon();
			GraphicsRenderer.drawImage(x + (i * 30), y, handle, GraphicsType.ICON);
		}
	},
	
	_getWandIcon: function() {
		var list = root.getBaseData().getWeaponTypeList(3);
		
		return list.getDataFromId(0).getIconResourceHandle();
	}
};

// 発動率の描画を管理する
var InvocationRenderer = {
	getInvocationText: function(value, type) {
		var text = '';
		
		if (type === InvocationType.HPDOWN) {
			text = ParamGroup.getParameterName(ParamGroup.getParameterIndexFromType(ParamType.MHP)) + value + StringTable.SkillWord_Less;
		}
		else if (type === InvocationType.ABSOLUTE) {
			text = value + StringTable.SignWord_Percent;
		}
		else {
			if (type === InvocationType.LV) {
				text = StringTable.Status_Level;
			}
			else {
				text = ParamGroup.getParameterName(ParamGroup.getParameterIndexFromType(type));
			}
		
			text = '(' + text;
			if (value > 1) {
				text += ' ' + StringTable.SignWord_Multiple + '' + value;
			}
			text += ')' + StringTable.SignWord_Percent;
		}
		
		return text;
	}
};

var ChapterRenderer = {
	getChapterText: function(mapInfo) {
		var text;
		var number = mapInfo.getChapterNumber();
		var mapType = mapInfo.getMapType();
		
		if (mapType === MapType.NORMAL || mapType === MapType.EXTRA) {
			if (number === 0) {
				text = StringTable.Chapter_First;
			}
			else if (number === -1) {
				text = StringTable.Chapter_Last;
			}
			else {
				text = StringTable.Chapter_Header + number + StringTable.Chapter_Footer;
			}
			
			if (mapType === MapType.EXTRA) {
				text += StringTable.Chapter_SideStory;
			}
		}
		else {
			text =  StringTable.Chapter_Quest + number;
		}
		
		return text;
	}
};

var WindowRenderer = {
	drawStretchWindow: function(x, y, width, height, pic) {
		var picCache = CacheControl.getCacheGraphics(width, height, pic);
		var graphicsManager = root.getGraphicsManager();
		
		if (picCache !== null) {
			if (picCache.isCacheAvailable()) {
				picCache.draw(x, y);
				return;
			}
		}
		else {
			picCache = CacheControl.createCacheGraphics(width, height, pic);
		}
		
		graphicsManager.setRenderCache(picCache);
		this.drawStretchWindowInternal(0, 0, width, height, pic);
		graphicsManager.resetRenderCache();
		
		picCache.draw(x, y);
	},
	
	drawStretchWindowInternal: function(x, y, width, height, pic) {
		var i;
		var skinWidth = UIFormat.MENUWINDOW_WIDTH / 2;
		var skinHeight = UIFormat.MENUWINDOW_HEIGHT;
		var d = 2;
		var frameWidth = 16;
		var frameHeight = 16;
		var xSrc = skinWidth;
		var xDestPos = [0, width - frameWidth, 0, width - frameWidth];
		var yDestPos = [0, 0, height - frameHeight, height - frameHeight];
		var xSrcPos = [0, skinWidth - frameWidth, 0, skinWidth - frameWidth];
		var ySrcPos = [0, 0, skinHeight - frameHeight, skinHeight - frameHeight];
		
		if (pic === null) {
			return;
		}
		
		pic.drawStretchParts(x + d, y + d, width - (d * 2), height - (d * 2), 0, 0, skinWidth, skinHeight);
	
		// フレーム4隅の描画
		for (i = 0; i < 4; i++) {
			pic.drawStretchParts(x + xDestPos[i], y + yDestPos[i], frameWidth, frameHeight,
				xSrc + xSrcPos[i], 0 + ySrcPos[i], frameWidth, frameHeight);
		}
		
		function drawFrameTopAndBottom(x, y, xSrc, ySrc) {
			var dx;
			var lineWidth = 32;
			var lineHeight = 16;
			var isLast = false;
			
			for (dx = frameWidth; !isLast; dx += lineWidth) {
				// フレームを32の長さで描画すると隅とぶつかるか調べる
				if (dx + lineWidth > width - frameWidth) {
					// ぶつからない長さに調整し、今回の描画を最後にする
					lineWidth = width - (dx + frameWidth);
					isLast = true;
				}
				pic.drawStretchParts(x + dx, y, lineWidth, lineHeight, xSrc + frameWidth, ySrc, lineWidth, lineHeight);
			}
		}
		
		function drawFrameLeftAndRight(x, y, xSrc, ySrc) {
			var dy;
			var lineWidth = 16;
			var lineHeight = 32;
			var isLast = false;
			
			for (dy = frameHeight; !isLast; dy += lineHeight) {
				if (dy + lineHeight > height - frameHeight) {
					lineHeight = height - (dy + frameHeight);
					isLast = true;
				}
				pic.drawStretchParts(x, y + dy, lineWidth, lineHeight, xSrc, ySrc + frameHeight, lineWidth, lineHeight);
			}
		}
		
		// 隅を除く上フレームを描画
		drawFrameTopAndBottom(x, y, xSrc, 0);
		
		// 隅を除く下フレームを描画
		drawFrameTopAndBottom(x, y + (height - frameHeight), xSrc, skinHeight - frameHeight);
		
		// 隅を除く左フレームを描画
		drawFrameLeftAndRight(x, y, xSrc, 0);
		
		// 隅を除く右フレームを描画
		drawFrameLeftAndRight(x + (width - frameWidth), y, xSrc + (skinWidth - frameWidth), 0);
	}
};

var CacheControl = {
	_cacheArray: null,
	
	clearCache: function() {
		this._cacheArray = [];
	},
	
	getCacheGraphics: function(width, height, pic) {
		var i, cache;
		var count = this._cacheArray.length;
		
		// 要求された情報と一致するキャッシュを探す
		for (i = 0; i < count; i++) {
			cache = this._cacheArray[i];
			if (cache.width === width && cache.height === height && cache.pic === pic) {
				return cache.picCache;
			}
		}
		
		return null;
	},
	
	createCacheGraphics: function(width, height, pic) {
		var cache;
		var picCache = this.getCacheGraphics(width, height, pic);
		
		if (picCache !== null) {
			// 既にキャッシュが存在する場合は、そのキャッシュを使用する
			return picCache;
		}
		
		cache = {};
		cache.width = width;
		cache.height = height;
		cache.pic = pic;
		cache.picCache = root.getGraphicsManager().createCacheGraphics(width, height);
		this._cacheArray.push(cache);
		
		return cache.picCache;
	}
};
