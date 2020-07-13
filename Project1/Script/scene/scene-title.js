
var TitleSceneMode = {
	FLOW: 0,
	BLACKIN: 1,
	SELECT: 2,
	OPEN: 3
};

var TitleScene = defineObject(BaseScene,
{
	_commandArray: null,
	_scrollbar: null,
	_transition: null,
	_straightFlow: null,
	_scrollBackground: null,
	
	setSceneData: function() {
		// 徐々に画面が明るくなるようにしたいため、塗りつぶしておく
		SceneManager.setEffectAllRange(true);
		
		this._prepareSceneMemberData();
		this._completeSceneMemberData();
	},
	
	moveSceneCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === TitleSceneMode.FLOW) {
			result = this._moveFlow();
		}
		else if (mode === TitleSceneMode.BLACKIN) {
			result = this._moveBlackin();
		}
		else if (mode === TitleSceneMode.SELECT) {
			result = this._moveSelect();
		}
		else if (mode === TitleSceneMode.OPEN) {
			result = this._moveOpen();
		}
		
		this._scrollBackground.moveScrollBackground();
		
		return result;
	},
	
	moveBackSceneCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === TitleSceneMode.FLOW) {
			this._straightFlow.moveBackStraightFlow();
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawSceneCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === TitleSceneMode.FLOW) {
			this._straightFlow.drawStraightFlow();
			return;
		}
		else if (mode === TitleSceneMode.BLACKIN) {
			this._transition.drawTransition();
		}
		
		this._drawBackground();
		this._drawLogo();
		this._drawScrollbar();
		
		if (mode === TitleSceneMode.SELECT) {
			this._drawSelect();
		}
		else if (mode === TitleSceneMode.OPEN) {
			this._drawOpen();
		}
	},
	
	_prepareSceneMemberData: function() {
		this._commandArray = [];
		this._scrollbar = createScrollbarObject(TitleScreenScrollbar, this);
		this._transition = createObject(SystemTransition);
		this._straightFlow = createObject(StraightFlow);
		this._scrollBackground = createObject(ScrollBackground);
	},
	
	_completeSceneMemberData: function() {
		this._configureTitleItem(this._commandArray);
		
		this._scrollbar.setScrollFormation(1, this._commandArray.length);
		this._scrollbar.setObjectArray(this._commandArray);
		this._setFirstIndex();
		
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
		this._straightFlow.enterStraightFlow();
		
		this._setBackgroundData();
		
		this.changeCycleMode(TitleSceneMode.FLOW);
	},
	
	_setBackgroundData: function() {
		var handle = root.queryGraphicsHandle('titleback');
		var pic = GraphicsRenderer.getGraphics(handle, GraphicsType.SCREENBACK);
		
		this._scrollBackground.startScrollBackground(pic);
	},
	
	_setFirstIndex: function() {
		var index;
		
		if (this._scrollbar.getObjectCount() === 0) {
			return;
		}
		
		// セーブファイルが1つでもあれば、続きからを既定にする
		if (root.getLoadSaveManager().getSaveFileCount() > 0) {
			index = this._getIndexFromCommandAction(CommandActionType.CONTINUE);
		}
		else {
			index = this._getIndexFromCommandAction(CommandActionType.NEWGAME);
		}
		
		this._scrollbar.setIndex(index);
	},
	
	_getIndexFromCommandAction: function(commandActionType) {
		var i, commandLayout;
		var count = this._scrollbar.getObjectCount();
		
		for (i = 0; i < count; i++) {
			commandLayout = this._scrollbar.getObjectFromIndex(i).getCommandLayout();
			if (commandLayout.getCommandActionType() === commandActionType) {
				return i;
			}
		}
		
		return 0;
	},
	
	_moveFlow: function() {
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			this._transition.setFadeSpeed(7);
			this._transition.setDestIn();
			MediaControl.musicPlayNew(root.querySoundHandle('titlemusic'));
			
			// タイトル画面の表示
			this.changeCycleMode(TitleSceneMode.BLACKIN);
		}
	},
	
	_moveBlackin: function() {
		if (this._transition.moveTransition() !== MoveResult.CONTINUE) {
			this._scrollbar.setActive(true);
			this.changeCycleMode(TitleSceneMode.SELECT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveSelect: function() {
		var object;
		var input = this._scrollbar.moveInput();
		
		if (input === ScrollbarInput.SELECT) {
			object = this._scrollbar.getObject();
			if (object !== null && object.isSelectable()) {
				object.openCommand();
				this.changeCycleMode(TitleSceneMode.OPEN);
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveOpen: function() {
		var object = this._scrollbar.getObject();
		
		if (object.moveCommand() !== MoveResult.CONTINUE) {
			this._scrollbar.setActive(true);
			this.changeCycleMode(TitleSceneMode.SELECT);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawSelect: function() {
	},
	
	_drawOpen: function() {
		var object;
		
		object = this._scrollbar.getObject();
		object.drawCommand();
	},
	
	_drawBackground: function() {
		this._scrollBackground.drawScrollBackground();
	},
	
	_drawLogo: function() {
		var x, y;
		var pic = root.queryUI('gamelogo_frame');
		
		if (pic !== null) {
			x = LayoutControl.getRelativeY(8) - 60;
			y = LayoutControl.getRelativeY(6) - 40;
			pic.draw(x, y);
		}
	},
	
	_drawScrollbar: function() {
		var x, y;
		var width = this._scrollbar.getScrollbarWidth();
		var height = this._scrollbar.getScrollbarHeight();
		var dx = LayoutControl.getRelativeX(8) - 60;
		var dy = LayoutControl.getRelativeY(7);
		
		x = root.getGameAreaWidth() - width - dx;
		y = root.getGameAreaHeight() - height - dy;
		this._scrollbar.drawScrollbar(x, y);
	},
	
	_configureTitleItem: function(groupArray) {
		var mixer = createObject(CommandMixer);
		
		mixer.pushCommand(TitleCommand.NewGame, CommandActionType.NEWGAME);
		mixer.pushCommand(TitleCommand.Continue, CommandActionType.CONTINUE);
		mixer.pushCommand(TitleCommand.EndGame, CommandActionType.ENDGAME);
		
		mixer.mixCommand(CommandLayoutType.TITLE, groupArray, BaseTitleCommand);
	},
	
	_pushFlowEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(DemoFlowEntry);
	}
}
);

var TitleScreenScrollbar = defineObject(BaseScrollbar,
{
	drawScrollContent: function(x, y, object, isSelect, index) {
		var text = object.getCommandName();
		var textui = this.getScrollTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		var pic = textui.getUIImage();
		
		if (!object.isSelectable()) {
			color = ColorValue.DISABLE;
		}
		
		TextRenderer.drawFixedTitleText(x, y, text, color, font, TextFormat.CENTER, pic, 5);
	},
	
	drawDescriptionLine: function(x, y) {
	},
	
	playSelectSound: function() {
		var object = this.getObject();
		
		if (object !== null && object.isSelectable()) {
			MediaControl.soundDirect('commandselect');
		}
		else {
			MediaControl.soundDirect('operationblock');
		}
	},
	
	playCancelSound: function() {
	},
	
	getObjectWidth: function() {
		return 220;
	},
	
	getObjectHeight: function() {
		return 45;
	},
	
	getScrollTextUI: function() {
		return root.queryTextUI('openingcommand_title');
	}
}
);

var BaseTitleCommand = defineObject(BaseCommand,
{
	openCommand: function() {
	},
	
	moveCommand: function() {
		return MoveResult.END;
	},
	
	drawCommand: function() {
	},
	
	isSelectable: function() {
		return true;
	}
}
);

var TitleCommand = {};

var NewGameMode = {
	BLACKOUT: 0,
	FLOW: 1
};

TitleCommand.NewGame = defineObject(BaseTitleCommand,
{
	_transition: null,
	_straightFlow: null,
	
	openCommand: function() {
		this._createSubObject();
		this.changeCycleMode(NewGameMode.BLACKOUT);
	},
	
	moveCommand: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === NewGameMode.BLACKOUT) {
			result = this._moveBlackOut();
		}
		else if (mode === NewGameMode.FLOW) {
			result = this._moveFlow();
		}
		
		return result;
	},
	
	drawCommand: function() {
		var mode = this.getCycleMode();
		
		if (mode === NewGameMode.BLACKOUT) {
			this._drawBlackOut();
		}
		else if (mode === NewGameMode.FLOW) {
			this._drawFlow();
		}
	},
	
	isSelectable: function() {
		return true;
	},
	
	_createSubObject: function() {
		this._transition = createObject(FadeTransition);
		this._transition.setDestOut();
		this._transition.setFadeSpeed(5);
		
		this._straightFlow = createObject(StraightFlow);
		this._straightFlow.setStraightFlowData(this);
		this._pushFlowEntries(this._straightFlow);
	},
	
	_moveBlackOut: function() {
		if (this._transition.moveTransition() !== MoveResult.CONTINUE) {
			if (!this._changeFlow()) {
				this._doEndAction();
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveFlow: function() {
		if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
			this._doEndAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawBlackOut: function() {
		this._transition.drawTransition();
	},
	
	_drawFlow: function() {
		this._straightFlow.drawStraightFlow();
	},
	
	_changeFlow: function() {
		if (this._straightFlow.enterStraightFlow() === EnterResult.NOTENTER) {
			return false;
		}
		
		this.changeCycleMode(NewGameMode.FLOW);
		
		return true;
	},
	
	_doEndAction: function() {
		MediaControl.resetMusicList();
		
		// 内部でroot.changeScene(SceneType.BATTLESETUP)が呼ばれる
		root.getSceneController().newGame();
	},
	
	_pushFlowEntries: function(straightFlow) {
		straightFlow.pushFlowEntry(DifficultyFlowEntry);
		straightFlow.pushFlowEntry(ClearPointFlowEntry);
	}
}
);

TitleCommand.Continue = defineObject(BaseTitleCommand,
{
	_loadSaveScreen: null,

	openCommand: function() {
		var screenParam = this._createLoadSaveParam();
		
		this._loadSaveScreen = createObject(LoadSaveScreen);
		SceneManager.addScreen(this._loadSaveScreen, screenParam);
	},
	
	moveCommand: function() {
		if (SceneManager.isScreenClosed(this._loadSaveScreen)) {
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	isSelectable: function() {
		return root.getLoadSaveManager().getSaveFileCount() > 0;
	},
	
	_createLoadSaveParam: function() {
		var screenParam = ScreenBuilder.buildLoadSave();
		
		screenParam.isLoad = true;
		
		return screenParam;
	}
}
);

TitleCommand.EndGame = defineObject(BaseTitleCommand,
{
	openCommand: function() {
	},
	
	moveCommand: function() {
		// openCommandで呼び出してもよいが、効果音が途切れたように聞こえる
		root.endGame();
		return MoveResult.END;
	},
	
	isSelectable: function() {
		return true;
	}
}
);

var DemoFlowEntry = defineObject(BaseFlowEntry,
{
	_eventChecker: null,
	_prevSoundIndex: 0,

	enterFlowEntry: function(titleScene) {
		if (!root.openMap(this._getMapId())) {
			return EnterResult.NOTENTER;
		}
		
		this._prepareMemberData(titleScene);
		return this._completeMemberData(titleScene);
	},
	
	moveFlowEntry: function() {
		this._doEndAction();
		SceneManager.setEffectAllRange(true);
		return MoveResult.END;
	},
	
	moveBackFlowEntry: function() {
		if (this._isSelectEnd()) {
			root.setEventSkipMode(true);
		}
		
		MapLayer.moveMapLayer();
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		if (!root.isEventSceneActived()) {
			root.getGraphicsManager().fill(0x0);
			return;
		}
		
		MapLayer.drawUnitLayer();
	},
	
	_prepareMemberData: function(titleScene) {
		this._eventChecker = createObject(EventChecker);
	},
	
	_completeMemberData: function(titleScene) {
		var result;
		
		SceneManager.resetCurrentMap();
		SceneManager.setEffectAllRange(true);
		
		// 効果音を無効にする
		this._enableSoundVolume(false);
		
		result = this._eventChecker.enterEventChecker(this._getEventList(), this._getEventType());
		if (result === EnterResult.NOTENTER) {
			this._enableSoundVolume(true);
			this._doEndAction();
			return EnterResult.NOTENTER;
		}
		
		return EnterResult.OK;
	},
	
	_doEndAction: function() {
		this._enableSoundVolume(true);
		root.closeMap();
	},
	
	_isSelectEnd: function() {
		// デモは自動で流れたほうがよいと思われるため、
		// 決定キーの押下をイベント終了として扱うようにしている。
		return InputControl.isSelectAction();
	},
	
	_getMapId: function() {
		return DataConfig.getDemoMapId();
	},
	
	_getEventList: function() {
		return root.getCurrentSession().getOpeningEventList();
	},
	
	_getEventType: function() {
		return EventType.OPENING;
	},
	
	_enableSoundVolume: function(isOn) {
		var arr = [100, 75, 50, 25, 0];
		
		if (DataConfig.isDemoMapSoundEnabled()) {
			return;
		}
		
		if (isOn) {
			root.getMediaManager().setSoundVolume(arr[this._prevSoundIndex]);
		}
		else {
			this._prevSoundIndex = root.getMetaSession().getDefaultEnvironmentValue(1);
			root.getMediaManager().setSoundVolume(0);
		}
	}
}
);

var DifficultyFlowEntry = defineObject(BaseFlowEntry,
{
	_messageAnalyzer: null,
	_scrollbar: null,
	_difficultyIndex: 0,
	
	enterFlowEntry: function(newGameCommand) {
		if (!this._isDifficultyEnabled()) {
			this._startSession(0);
			return EnterResult.NOTENTER;
		}
		
		this._prepareMemberData(newGameCommand);
		return this._completeMemberData(newGameCommand);
	},
	
	moveFlowEntry: function() {
		var input = this._scrollbar.moveInput();
		
		if (input === ScrollbarInput.SELECT) {
			this._startSession(this._scrollbar.getIndex());
			return MoveResult.END;
		}
		else if (input === ScrollbarInput.NONE) {
			this._checkIndexAndText();
		}
		
		return MoveResult.CONTINUE;
	},
	
	drawFlowEntry: function() {
		var pic  = this.getWindowTextUI().getUIImage();
		var width = this._getWindowWidth();
		var height = this._getWindowHeight();
		var x = LayoutControl.getCenterX(-1, width);
		var y = LayoutControl.getCenterY(-1, height);
		
		root.getGraphicsManager().fill(0x0);
		
		WindowRenderer.drawStretchWindow(x, y, width, height, pic);
		
		x += DefineControl.getWindowXPadding();
		y += DefineControl.getWindowYPadding();
		this._drawContent(x, y);
	},
	
	getWindowTextUI: function() {
		return root.queryTextUI('single_window');
	},
	
	_prepareMemberData: function(newGameCommand) {
		this._createMessageAnalyzer();
		this._createScrollbar();
	},
	
	_completeMemberData: function(newGameCommand) {
		this._scrollbar.setDataList(root.getBaseData().getDifficultyList());
		this._scrollbar.setActive(true);
		
		this._checkIndexAndText();
		
		return EnterResult.OK;
	},
	
	_isDifficultyEnabled: function() {
		// 難易度が複数存在する場合は、選択できるようにする
		return root.getBaseData().getDifficultyList().getCount() > 1;
	},
	
	_startSession: function(index) {
		var list = root.getBaseData().getDifficultyList();
		var object = list.getData(index);
		
		root.getSceneController().initializeMetaSession(object);
	},
	
	_getWindowWidth: function() {
		return 400;
	},
	
	_getWindowHeight: function() {
		return 200;
	},
	
	_createScrollbar: function() {
		var count = root.getBaseData().getDifficultyList().getCount();
		
		// 一度に表示できる最大数は3としている
		if (count > 3) {
			count = 3;
		}
		
		this._scrollbar = createScrollbarObject(DifficultyScrollbar, this);
		this._scrollbar.setScrollFormation(count, 1);
	},
	
	_createMessageAnalyzer: function() {
		var messageAnalyzerParam = this._createMessageAnalyzerParam();
		
		this._messageAnalyzer = createObject(MessageAnalyzer);
		this._messageAnalyzer.setMessageAnalyzerParam(messageAnalyzerParam);
		this._messageAnalyzer.setMaxRowCount(3);
	},
	
	_createMessageAnalyzerParam: function() {
		var textui = this.getWindowTextUI();
		var messageAnalyzerParam = StructureBuilder.buildMessageAnalyzerParam();
		
		messageAnalyzerParam.color = ColorValue.INFO;
		messageAnalyzerParam.font = textui.getFont();
		messageAnalyzerParam.messageSpeedType = SpeedType.DIRECT;
		
		return messageAnalyzerParam;
	},
	
	_checkIndexAndText: function() {
		var text;
		
		if (this._scrollbar.checkAndUpdateIndex()) {
			text = this._scrollbar.getObject().getDescription();
			this._messageAnalyzer.setMessageAnalyzerText(text);
		}
	},
	
	_drawContent: function(x, y) {
		this._drawTitleArea(x, y);
		this._drawDifficultyArea(x, y);
		this._drawDivisionLine(x, y);
		this._drawDescriptionArea(x, y);
	},
	
	_drawTitleArea: function(x, y) {
		var range;
		var text = this._getSelectMessage();
		var textui = this.getWindowTextUI();
		var color = textui.getColor();
		var font = textui.getFont();
		
		range = createRangeObject(x - 16, y, this._getWindowWidth(), 23);
		TextRenderer.drawRangeText(range, TextFormat.CENTER, text, -1, color, font);
	},
	
	_drawDifficultyArea: function(x, y) {
		var dx = Math.floor(this._getWindowWidth() - this._scrollbar.getScrollbarWidth()) / 3;
		
		y += 50;
		
		this._scrollbar.drawScrollbar(x + dx, y);
	},
	
	_drawDescriptionArea: function(x, y) {
		y += 50;
		y += this._scrollbar.getScrollbarHeight() + 10;
		
		this._messageAnalyzer.drawMessageAnalyzer(x, y, -1, -1, null);
	},
	
	_drawDivisionLine: function(x, y) {
		var textui = root.queryTextUI('description_title');
		var pic = textui.getUIImage();
		
		TitleRenderer.drawTitle(pic, x, y, TitleRenderer.getTitlePartsWidth(), TitleRenderer.getTitlePartsHeight(), 10);
	},
	
	_getSelectMessage: function() {
		return StringTable.GameStart_DifficultySelect;
	}
}
);

var DifficultyScrollbar = defineObject(BaseScrollbar,
{
	drawScrollContent: function(x, y, object, isSelect, index) {
		var range;
		var length = this._getTextLength();
		var textui = this.getParentTextUI();
		var color = ColorValue.KEYWORD;
		var font = textui.getFont();
		
		range = createRangeObject(x, y, length, 25);
		TextRenderer.drawRangeText(range, TextFormat.CENTER, object.getName(), length, color, font);
	},
	
	drawDescriptionLine: function(x, y) {
	},
	
	playCancelSound: function() {
	},
	
	getObjectWidth: function() {
		return DefineControl.getTextPartsWidth() - 40;
	},
	
	getObjectHeight: function() {
		return DefineControl.getTextPartsHeight();
	},
	
	_getTextLength: function() {
		return this.getObjectWidth();
	}
}
);

var ClearPointMode = {
	INFO: 0,
	QUESTION: 1,
	SCREEN: 2
};

var ClearPointFlowEntry = defineObject(BaseFlowEntry,
{
	_infoWindow: null,
	_questionWindow: null,
	_pointLayoutScreen: null,
	
	enterFlowEntry: function(newGameCommand) {
		if (!this._isScreenDisplayable()) {
			return EnterResult.NOTENTER;
		}
		
		this._prepareMemberData(newGameCommand);
		return this._completeMemberData(newGameCommand);
	},
	
	moveFlowEntry: function() {
		var result = MoveResult.CONTINUE;
		var mode = this.getCycleMode();
		
		if (mode === ClearPointMode.INFO) {
			result = this._moveInfo();
		}
		else if (mode === ClearPointMode.QUESTION) {
			result = this._moveQuestion();
		}
		else if (mode === ClearPointMode.SCREEN) {
			result = this._moveScreen();
		}
		
		return result;
	},
	
	drawFlowEntry: function() {
		var mode = this.getCycleMode();
		
		root.getGraphicsManager().fill(0x0);
		
		if (mode === ClearPointMode.INFO) {
			this._drawInfo();
		}
		else if (mode === ClearPointMode.QUESTION) {
			this._drawQuestion();
		}
		else if (mode === ClearPointMode.SCREEN) {
			this._drawScreen();
		}
	},
	
	_prepareMemberData: function(newGameCommand) {
		this._infoWindow = createWindowObject(InfoWindow, this);
		this._questionWindow = createWindowObject(QuestionWindow, this);
	},
	
	_completeMemberData: function(newGameCommand) {
		var point = root.getExternalData().getGameClearPoint();
		var text = StringTable.GameStart_ClearPointDescription + point + StringTable.CurrencySign_Point;
		
		this._infoWindow.setInfoMessageAndType(text, InfoWindowType.INFORMATION);
		
		this.changeCycleMode(ClearPointMode.INFO);
		
		return EnterResult.OK;
	},
	
	_moveInfo: function() {
		if (this._infoWindow.moveWindow() !== MoveResult.CONTINUE) {
			if (this._isInfoDisplayable()) {
				this._questionWindow.setQuestionMessage(StringTable.GameStart_ClearPointQuestion);
				this._questionWindow.setQuestionActive(true);
				this.changeCycleMode(ClearPointMode.QUESTION);
			}
			else {
				this._checkScreen();
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveQuestion: function() {
		if (this._questionWindow.moveWindow() !== MoveResult.CONTINUE) {
			if (this._questionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
				this._checkScreen();
			}
			else {
				return MoveResult.END;
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveScreen: function() {
		if (SceneManager.isScreenClosed(this._pointLayoutScreen)) {
			this._savePoint();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	_drawInfo: function() {
		var x = LayoutControl.getCenterX(-1, this._infoWindow.getWindowWidth());
		var y = LayoutControl.getCenterY(-1, this._infoWindow.getWindowHeight());
		
		this._infoWindow.drawWindow(x, y);
	},
	
	_drawQuestion: function() {
		var x = LayoutControl.getCenterX(-1, this._questionWindow.getWindowWidth());
		var y = LayoutControl.getCenterY(-1, this._questionWindow.getWindowHeight());
		
		this._questionWindow.drawWindow(x, y);
	},
	
	_drawScreen: function() {
	},
	
	_savePoint: function() {
		var type = root.getBaseData().getClearPointType();
		
		if (type === ClearPointType.CARRYOVER) {
			root.getExternalData().setGameClearPoint(this._pointLayoutScreen.getGold());
		}
		else if (type === ClearPointType.ZERO) {
			root.getExternalData().setGameClearPoint(0);
		}
	},
	
	_checkScreen: function() {
		var screenParam = this._createScreenParam();
		
		this._resetMusic(screenParam);
		
		// 画面に背景が設定されている場合に、スムーズに移行できるようにする
		SceneManager.setEffectAllRange(true);
		
		this._pointLayoutScreen = createObject(PointLayoutScreen);
		this._pointLayoutScreen.setScreenInteropData(screenParam.shopLayout.getShopInteropData());
		SceneManager.addScreen(this._pointLayoutScreen, screenParam);
		
		this.changeCycleMode(ClearPointMode.SCREEN);
		
		return true;
	},
	
	_resetMusic: function(screenParam) {
		var interop = screenParam.shopLayout.getShopInteropData();
		
		if (!interop.getScreenMusicHandle().isNullHandle()) {
			// 画面にBGMが設定されている場合は、画面を閉じた際に戻らないようにする
			MediaControl.resetMusicList();
		}
	},
	
	_isInfoDisplayable: function() {
		return false;
	},
	
	_isScreenDisplayable: function() {
		var shopData = this._getShopData();
		
		if (shopData.getShopItemArray().length === 0) {
			return false;
		}
		
		return root.getExternalData().getGameClearPoint() > 0;
	},
	
	_getShopData: function() {
		return root.getBaseData().getPointShop();
	},
	
	_createScreenParam: function() {
		var screenParam = ScreenBuilder.buildBonusLayout();
		var shopData = this._getShopData();
		
		screenParam.shopLayout = shopData.getShopLayout();
		screenParam.itemArray = shopData.getShopItemArray();
		screenParam.bonusArray = shopData.getBonusNumberArray();
		
		return screenParam;
	}
}
);
