
var LoadSaveMode = {
	TOP: 0,
	SAVECHECK: 1
};

var LoadSaveScreen = defineObject(BaseScreen,
{
	_screenParam: null,
	_isLoadMode: false,
	_scrollbar: null,
	_questionWindow: null,
	
	setScreenData: function(screenParam) {
		this._prepareScreenMemberData(screenParam);
		this._completeScreenMemberData(screenParam);
	},
	
	moveScreenCycle: function() {
		var result = MoveResult.CONTINUE;
		
		if (this._isLoadMode) {
			result = this._moveLoad();
		}
		else {
			result = this._moveSave();
		}
		
		return result;
	},
	
	drawScreenCycle: function() {
		var x, y;
		var mode = this.getCycleMode();
		
		x = LayoutControl.getCenterX(-1, this._scrollbar.getScrollbarWidth());
		y = LayoutControl.getCenterY(-1, this._scrollbar.getScrollbarHeight());
		this._scrollbar.drawScrollbar(x, y);
	
		if (mode === LoadSaveMode.SAVECHECK) {
			x = LayoutControl.getCenterX(-1, this._questionWindow.getWindowWidth());
			y = LayoutControl.getCenterY(-1, this._questionWindow.getWindowHeight());
			this._questionWindow.drawWindow(x, y);
		}
	},
	
	getScreenInteropData: function() {
		return root.queryScreen('Load');
	},
	
	_prepareScreenMemberData: function(screenParam) {
		this._screenParam = screenParam;
		this._isLoadMode = screenParam.isLoad;
		this._scrollbar = createScrollbarObject(LoadSaveScrollbar, this);
		this._questionWindow = createWindowObject(QuestionWindow, this);
	},
	
	_completeScreenMemberData: function(screenParam) {
		var count = LayoutControl.getObjectVisibleCount(76, 5);
		
		this._scrollbar.setScrollFormation(2, count);
		this._scrollbar.setActive(true);
		this._setScrollData(DefineControl.getMaxSaveFileCount(), this._isLoadMode);
		this._setDefaultSaveFileIndex();
		
		this._questionWindow.setQuestionMessage(StringTable.LoadSave_SaveQuestion);
		
		this.changeCycleMode(LoadSaveMode.TOP);
	},
	
	_setScrollData: function(count, isLoadMode) {
		var i;
		var manager = root.getLoadSaveManager();
		
		for (i = 0; i < count; i++) {
			this._scrollbar.objectSet(manager.getSaveFileInfo(i));
		}
	
		this._scrollbar.objectSetEnd();
		
		this._scrollbar.setLoadMode(isLoadMode);
	},
	
	_setDefaultSaveFileIndex: function() {
		var index = root.getExternalData().getActiveSaveFileIndex();
		
		// 以前使用したファイルのインデックスにカーソルを合わせる
		if (this._scrollbar.getObjectCount() > index) {
			this._scrollbar.setIndex(index);
		}
	},
	
	_moveLoad: function() {
		var input;
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === LoadSaveMode.TOP) {
			input = this._scrollbar.moveInput();
			if (input === ScrollbarInput.SELECT) {
				this._executeLoad();
			}
			else if (input === ScrollbarInput.CANCEL) {
				result = MoveResult.END;
			}
		}
		
		return result;
	},
	
	_moveSave: function() {
		var input;
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === LoadSaveMode.TOP) {
			input = this._scrollbar.moveInput();
			if (input === ScrollbarInput.SELECT) {
				this._scrollbar.enableSelectCursor(false);
				this._questionWindow.setQuestionActive(true);
				this.changeCycleMode(LoadSaveMode.SAVECHECK);
			}
			else if (input === ScrollbarInput.CANCEL) {
				result = MoveResult.END;
			}
		}
		else if (mode === LoadSaveMode.SAVECHECK) {
			if (this._questionWindow.moveWindow() !== MoveResult.CONTINUE) {
				if (this._questionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
					this._executeSave();
				}
				
				this._scrollbar.enableSelectCursor(true);
				this.changeCycleMode(LoadSaveMode.TOP);
			}
		}
		
		return result;
	},
	
	_executeLoad: function() {
		var index = this._scrollbar.getIndex();
		var object = root.getLoadSaveManager().getSaveFileInfo(index);
		
		if (object.isCompleteFile() || object.getMapInfo() !== null) {
			SceneManager.setEffectAllRange(true);
			
			// 内部でroot.changeSceneが呼ばれ、セーブファイルに記録されているシーンに変更される。
			root.getLoadSaveManager().loadFile(index);
		}
	},
	
	_executeSave: function() {
		var index = this._scrollbar.getIndex();
		
		root.getLoadSaveManager().saveFile(index, this._screenParam.scene, this._screenParam.mapId, this._getCustomObject());
	},
	
	_getCustomObject: function() {
		return {};
	}
}
);

var DataSaveScreen = defineObject(LoadSaveScreen,
{
	getScreenInteropData: function() {
		return root.queryScreen('Save');
	}
}
);

var LoadSaveScrollbar = defineObject(BaseScrollbar,
{
	_isLoadMode: false,
	
	drawScrollContent: function(x, y, object, isSelect, index) {
		var width = this.getObjectWidth();
		var height = this.getObjectHeight();
		var pic = this._getWindowTextUI().getUIImage();
		
		WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		
		x += DefineControl.getWindowXPadding();
		y += DefineControl.getWindowYPadding();
		
		if (object.isCompleteFile() || object.getMapInfo() !== null) {
			this._drawMain(x, y, object, index);
		}
		else {
			this._drawEmptyFile(x, y, index);
		}
	},
	
	drawDescriptionLine: function(x, y) {
	},
	
	playSelectSound: function() {
		var object = this.getObject();
		var isSelect = true;
		
		if (this._isLoadMode) {
			if (!object.isCompleteFile() && object.getMapInfo() === null) {
				isSelect = false;
			}
		}
		
		if (isSelect) {
			MediaControl.soundDirect('commandselect');
		}
		else {
			MediaControl.soundDirect('operationblock');
		}
	},
	
	getSpaceX: function() {
		return 0;
	},
	
	getSpaceY: function() {
		return 0;
	},
	
	getObjectWidth: function() {
		return 260;
	},
	
	getObjectHeight: function() {
		return 76;
	},
	
	setLoadMode: function(isLoadMode) {
		this._isLoadMode = isLoadMode;
	},
	
	_drawMain: function(x, y, object, index) {
		this._drawChapterNumber(x, y, object);
		this._drawChapterName(x, y, object);
		this._drawPlayTime(x, y, object);
		this._drawTurnNo(x, y, object);
		this._drawDifficulty(x, y, object);
	},
	
	_drawChapterNumber: function(xBase, yBase, object) {
		var text;
		var textui = this._getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var x = xBase;
		var y = yBase;
		
		if (object.isCompleteFile()) {
			text = StringTable.Chapter_Rest;
		}
		else {
			text = ChapterRenderer.getChapterText(object.getMapInfo());
		}
		
		TextRenderer.drawKeywordText(x, y, text, -1, color, font);
	},
	
	_drawChapterName: function(xBase, yBase, object) {
		var text;
		var length = this._getTextLength();
		var textui = this._getWindowTextUI();
		var font = textui.getFont();
		var x = xBase + 80;
		var y = yBase;
		
		if (object.isCompleteFile()) {
			text = root.getRestPreference().getCompleteSaveTitle();
		}
		else {
			text = object.getMapInfo().getName();
		}
		
		TextRenderer.drawKeywordText(x, y, text, length, ColorValue.KEYWORD, font);
	},
	
	_drawPlayTime: function(xBase, yBase, object) {
		var x = xBase;
		var y = yBase + 25;
		
		ContentRenderer.drawPlayTime(x, y, object.getPlayTime());
	},
	
	_drawTurnNo: function(xBase, yBase, object) {
		var width;
		var textui = this._getWindowTextUI();
		var font = textui.getFont();
		var text = StringTable.Signal_Turn;
		var turn = object.getTurnCount();
		var x = xBase + 80;
		var y = yBase + 25;
		
		if (turn > 0) {
			TextRenderer.drawKeywordText(x, y, text, -1, ColorValue.INFO, font);
			width = TextRenderer.getTextWidth(text, font) + 30;
			NumberRenderer.drawNumber(x + width, y, turn);
		}
		else if (object.getSceneType() === SceneType.REST) {
			TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_Rest, -1, ColorValue.INFO, font);
		}
	},
	
	_drawDifficulty: function(xBase, yBase, object) {
		var difficulty = object.getDifficulty();
		var x = xBase + 200;
		var y = yBase + 23;
		
		GraphicsRenderer.drawImage(x, y, difficulty.getIconResourceHandle(), GraphicsType.ICON);
	},
	
	_drawEmptyFile: function(xBase, yBase, index) {
		var length = this._getTextLength();
		var textui = this._getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var x = xBase;
		var y = yBase;
		
		TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_SaveFileMark + (index + 1), length, color, font);
		
		x += 90;
		y += 0;
		TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_NoData, -1, ColorValue.KEYWORD, font);
	},
	
	_getTextLength: function() {
		return this.getObjectWidth() - 80;
	},
	
	_getWindowTextUI: function() {
		return root.queryTextUI('default_window');
	}
}
);
