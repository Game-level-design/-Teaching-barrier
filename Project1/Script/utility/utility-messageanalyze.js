
var MessageAnalyzerMode = {
	PAGE: 0,
	CANCEL: 1,
	CLEAR: 2
};

var MessageAnalyzerState = {
	NONE: 0,
	ENDTEXT: 1,
	READBLOCK: 2
};

var MessageWaitState = {
	WAIT: 0,
	NONE: 1
};

var MessageRowCount = 3;

// 複数行の文字列を、1文字ずつ表示したい場合に使用する。
// 文字を表示する間隔や、ページの切り替えなどを主に担当し、
// 実際の文字の描画などはCoreAnalyzerのメソッドを呼び出している。
var MessageAnalyzer = defineObject(BaseObject,
{
	_voiceSoundHandle: null,
	_pageSoundHandle: null,
	_messageSpeedValue: 0,
	_messageState: 0,
	_pageCursor: null,
	_coreAnalyzer: null,
	_waitChain: null,
	_parserInfo: null,
	_cancelCounter: null,
	
	setMessageAnalyzerParam: function(messageAnalyzerParam) {
		this._voiceSoundHandle = messageAnalyzerParam.voiceSoundHandle;
		this._pageSoundHandle = messageAnalyzerParam.pageSoundHandle;
		this._messageSpeedValue = this._convertSpeed(messageAnalyzerParam.messageSpeedType);
		this._messageState = 0;
		this._pageCursor = createObject(PageCursor);
		this._coreAnalyzer = createObject(CoreAnalyzer);
		this._waitChain = createObject(WaitChain);
		this._cancelCounter = createObject(CycleCounter);
		
		this._parserInfo = StructureBuilder.buildParserInfo();
		this._parserInfo.defaultColor = messageAnalyzerParam.color;
		this._parserInfo.defaultFont = messageAnalyzerParam.font;
		this._parserInfo.maxTextLength = messageAnalyzerParam.maxTextLength;
		
		this._waitChain.setupWaitChain(this);
	},
	
	setMessageAnalyzerText: function(text) {
		this._parserInfo.wait = 0;
		this._parserInfo.autoWait = 0;
		this._parserInfo.speed = -1;
		this._coreAnalyzer.setCoreAnalyzerData(text, this._parserInfo);
		
		if (this._getCancelSpeedValue() >= 0) {
			this._cancelCounter.disableGameAcceleration();
			this._cancelCounter.setCounterInfo(this._getCancelSpeedValue());
		}
		
		this._startNewPage();
	},
	
	moveMessageAnalyzer: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === MessageAnalyzerMode.PAGE) {
			result = this._movePage();
		}
		else if (mode === MessageAnalyzerMode.CANCEL) {
			result = this._moveCancel();
		}
		else if (mode === MessageAnalyzerMode.CLEAR) {
			result = this._moveClear();
		}
		
		this._pageCursor.moveCursor();
		
		return result;
	},
	
	drawMessageAnalyzer: function(xMessage, yMessage, xCursor, yCursor, pic) {
		this._coreAnalyzer.drawCoreAnalyzer(xMessage, yMessage + 5);
		
		if (pic !== null) {
			if (this._messageState === MessageAnalyzerState.READBLOCK && !this._waitChain.isAutoMode()) {
				this._pageCursor.drawCursor(xCursor, yCursor, pic);
			}
		}
	},
	
	endMessageAnalyzer: function() {
		this._cleanPage();
	},
	
	setMaxRowCount: function(maxRowCount) {
		this._coreAnalyzer.setMaxRowCount(maxRowCount);
	},
	
	getEnsureText: function() {
		return this._coreAnalyzer.getEnsureText();
	},
	
	isMessageDirect: function() {
		// 0の場合は文字が1文字ずつではなく、一斉に表示される
		return this._messageSpeedValue === 0;
	},
	
	cutPage: function() {
		var isMessageDirect = this.isMessageDirect();
		
		for (;;) {
			// ページをカットするため、trueを指定
			this._checkCurrentPage(true);
			
			// 高速を理由にcutPageが呼ばれたが、
			// カット中にspeedが変更される可能性があるため確認
			if (isMessageDirect && !this.isMessageDirect()) {
				break;
			}
			
			// 1つのページを処理したからループを抜ける
			if (this._isPageLast()) {
				break;
			}
		}
		
		// ページを処理したため、明示的な待機は無効にする
		this._parserInfo.wait = 0;
		this._waitChain.endPage();
	},
	
	getMessageSpeed: function() {
		return this._messageSpeedValue;
	},
	
	setMessageSpeed: function(messageSpeedValue) {
		this._messageSpeedValue = messageSpeedValue;
	},
	
	getCoreAnalyzer: function() {
		return this._coreAnalyzer;
	},
	
	_movePage: function() {
		// 次のページに進むべきかを調べる
		if (this._isPageChange()) {
			this._changeNextPage();
			return MoveResult.CONTINUE;
		}
		else {
			// 現在のページの処理をしたいが、待機状態に入っているかを先に調べる
			if (this._waitChain.moveWaitChain() === MoveResult.CONTINUE) {
				// 待機状態に入っているため処理を続行しない
				return MoveResult.CONTINUE;
			}
		}
		
		// 現在のページを処理する
		this._checkCurrentPage(false);
		
		// 30FPSの場合は、2文字ずつ処理されることになる
		if (!DataConfig.isHighPerformance()) {
			this._checkCurrentPage(false);
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveCancel: function() {
		if (this._cancelCounter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._changeNextPage();
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveClear: function() {
		// これ以上テキストがないため終了する
		if (this._messageState === MessageAnalyzerState.ENDTEXT) {
			return MoveResult.END;
		}
		
		this._cleanPage();
		
		this._coreAnalyzer.nextCoreAnalyzer();
		this._waitChain.startPage();
		
		this._startNewPage();
		
		return MoveResult.CONTINUE;
	},
	
	_changeNextPage: function() {
		if (this._messageState === MessageAnalyzerState.NONE) {
			// 文字を表示している途中だった場合は、
			// いったん全ての文字を表示し、すぐにページを切り替えない。
			this.cutPage();
			return;
		}
		
		// 次のページに変わるため、音を鳴らす
		this._playMessagePageSound();
		
		this.changeCycleMode(MessageAnalyzerMode.CLEAR);
	},
	
	_startNewPage: function() {
		this._messageState = MessageAnalyzerState.NONE;
		
		if (this.isMessageDirect()) {
			if (this._voiceSoundHandle !== null && !this._voiceSoundHandle.isNullHandle()) {
				// 文字を一気に表示する場合でも、一度だけメッセージ音を再生する
				MediaControl.soundPlay(this._voiceSoundHandle);
			}
			this.cutPage();
		}
		
		this.changeCycleMode(MessageAnalyzerMode.PAGE);
	},
	
	// 1つのページが終了したときの処理
	_cleanPage: function() {
		// 既にボイスが再生されているならば、その音を停止する
		if (this._parserInfo.voiceRefId !== -1) {
			root.getMaterialManager().voiceStop(this._parserInfo.voiceRefId, false);
			this._parserInfo.voiceRefId = -1;
		}
	},
	
	_checkCurrentPage: function(isPageCut) {
		var isAdvance = true;
		
		if (this._isPageLast()) {
			// 既に1ページ処理されているから、何も処理しない
			return;
		}
		
		// ページ内の1文字を処理する
		this._messageState = this._coreAnalyzer.moveCoreAnalyzer();
		
		// 1ページを表示し終えたかどうか
		if (this._isPageLast()) {
			this._waitChain.endPage();
		}
		else {
			isAdvance = this._waitChain.checkWaitChain(this._parserInfo, isPageCut) === MessageWaitState.NONE;
		}
		
		if (isAdvance) {
			// ページをカットしない場合は、メッセージ音が再生されることがある
			if (!isPageCut) {
				this._playMessageVoiceSound();
			}
			this._coreAnalyzer.advanceStep();
		}
	},
	
	_isPageChange: function() {
		if (this._waitChain.isAutoMode()) {
			if (this._waitChain.isPageAutoChange()) {
				// 自動待機が完了したから、ページを切り替える
				return true;
			}
		}
		else {
			if (this._isCancelAllowed()) {
				// キャンセルキーを押しっぱなしの場合は、ページを切り替える
				if (this._getCancelSpeedValue() >= 0) {
					// 高速すぎる切り替えを避けたい場合は待機する
					this.changeCycleMode(MessageAnalyzerMode.CANCEL);
					return false;
				}
				
				// _getCancelSpeedValueがマイナスを返す場合は、待機せず即座にページを切り替える
				
				return true;
			}
			else if (InputControl.isSelectAction()) {
				// 決定キーが押された場合は、ページを切り替える
				return true;
			}
		}
		
		return false;
	},
	
	_isPageLast: function() {
		return this._messageState === MessageAnalyzerState.READBLOCK || this._messageState === MessageAnalyzerState.ENDTEXT;
	},
	
	_playMessageVoiceSound: function() {
		if (this._voiceSoundHandle !== null && !this._voiceSoundHandle.isNullHandle()) {
			if ((this._coreAnalyzer.getCurrentIndex() % 7) === 0) {
				MediaControl.soundPlay(this._voiceSoundHandle);
			}
		}
	},
	
	_playMessagePageSound: function() {
		if (this._pageSoundHandle !== null && !this._pageSoundHandle.isNullHandle()) {
			if (!this._waitChain.isAutoMode()) {
				MediaControl.soundPlay(this._pageSoundHandle);
			}
		}
	},
	
	_convertSpeed: function(speedType) {
		var n = 2;
		
		if (speedType === SpeedType.DIRECT || speedType === SpeedType.SUPERHIGH || speedType === SpeedType.HIGH) {
			n = 0;
		}
		else if (speedType === SpeedType.NORMAL) {
			n = 1;
		}
		
		return n;
	},
	
	_isCancelAllowed: function() {
		return InputControl.isCancelState();
	},
	
	_getCancelSpeedValue: function() {
		return 0;
	}
}
);

// メッセージを表示する際に、待機状態が発生するのは主に3つある。
// 1つ目は、\.のような制御文字による明示的な待機であり、ExplicitWaitが処理を担当する。
// 2つ目は、\atのような制御文字による待機であり、次のページに自動で切り替わるまで待機する。
// これは、AutoWaitが担当する。
// 3つ目は、次の文字を解析するまでの待機であり、コンフィグのメッセージスピードが遅く設定されていれば、
// それに応じて待機も長くなる。これは、SpeedWaitが担当する。
var WaitChain = defineObject(BaseObject,
{
	_waitPartsArray: null,
	
	setupWaitChain: function(parentMessageAnalyzer) {
		var i, count;
		
		this._waitPartsArray = [];
		this._configureWaitParts(this._waitPartsArray);
		
		count = this._waitPartsArray.length;
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].setupWaitParts(parentMessageAnalyzer);
		}
	},
	
	moveWaitChain: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].moveWaitParts() === MoveResult.CONTINUE) {
				return MoveResult.CONTINUE;
			}
		}
		
		return MoveResult.END;
	},
	
	checkWaitChain: function(parserInfo, isPageCut) {
		var i;
		var count = this._waitPartsArray.length;
		var waitState = MessageWaitState.NONE;
		
		for (i = 0; i < count; i++) {
			// 1つでもfalseを返すオブジェクトがあれば、次の文字には進まないことになる
			if (this._waitPartsArray[i].checkWaitParts(parserInfo, isPageCut) === MessageWaitState.WAIT) {
				waitState = MessageWaitState.WAIT;
			}
		}
		
		return waitState;
	},
	
	startPage: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].startPage();
		}
	},
	
	endPage: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			this._waitPartsArray[i].endPage();
		}
	},
	
	isPageAutoChange: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].isPageAutoChange()) {
				return true;
			}
		}
		
		return false;
	},
	
	isAutoMode: function() {
		var i;
		var count = this._waitPartsArray.length;
		
		for (i = 0; i < count; i++) {
			if (this._waitPartsArray[i].isAutoMode()) {
				return true;
			}
		}
		
		return false;
	},
	
	_configureWaitParts: function(groupArray) {
		groupArray.appendObject(WaitParts.Explicit);
		groupArray.appendObject(WaitParts.Auto);
		groupArray.appendObject(WaitParts.Speed);
	}
}
);

var BaseWaitParts = defineObject(BaseObject,
{
	_isWaitMode: false,
	_counter: null,
	_parentMessageAnalyzer: null,
	
	setupWaitParts: function(parentMessageAnalyzer) {
		this._counter = createObject(CycleCounter);
		this._parentMessageAnalyzer = parentMessageAnalyzer;
	},
	
	moveWaitParts: function() {
		if (!this._isWaitMode) {
			// 待機する場合は、MoveResult.CONTINUEを返す
			return MoveResult.END;
		}
		
		if (this._counter.moveCycleCounter() !== MoveResult.CONTINUE) {
			this._isWaitMode = false;
			this.doEndWaitAction();
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	// 次の文字に進まない場合は、MessageWaitState.WAITを返す
	checkWaitParts: function(parserInfo, isPageCut) {
		return MessageWaitState.NONE;
	},
	
	// 新しいページを処理する場合に呼ばれる
	startPage: function() {
	},
	
	// 1つのページの解析が完了したら呼ばれる
	endPage: function() {
	},
	
	// 入力なしでページを切り替えたい場合は、trueを返す
	isPageAutoChange: function() {
		return false;
	},
	
	// ページカーソルを表示しない場合は、trueを返す
	isAutoMode: function() {
		return false;
	},
	
	doEndWaitAction: function() {
	}
}
);

var WaitParts = {};

WaitParts.Explicit = defineObject(BaseWaitParts,
{	
	checkWaitParts: function(parserInfo, isPageCut) {
		// ページをカットしない場合のみ、待機情報の確認を行う
		if (!isPageCut && parserInfo.wait !== 0) {
			// 文字の中で/wsなどが見つかった場合は、待機状態に入る
			this._counter.setCounterInfo(parserInfo.wait);
			
			parserInfo.wait = 0;
			this._isWaitMode = true;
			
			// 待機状態になるため、次の文字に進まない
			return MessageWaitState.WAIT;
		}
		
		return MessageWaitState.NONE;
	},
	
	endPage: function() {
		this._counter.resetCounterValue();
		this._isWaitMode = false;
	},
	
	doEndWaitAction: function() {
		// 待機が終わったため、次の文字に進む
		this._parentMessageAnalyzer.getCoreAnalyzer().advanceStep();
	}
}
);

WaitParts.Auto = defineObject(BaseWaitParts,
{
	_isForceAuto: false,
	_isAutoSelectAction: false,
	
	checkWaitParts: function(parserInfo, isPageCut) {
		if (parserInfo.autoWait !== 0) {
			// 文字の中で/atが見つかった場合は、自動で次のページに入れるように準備
			this._counter.setCounterInfo(parserInfo.autoWait);
			parserInfo.autoWait = 0;
			this._isForceAuto = true;
		}
		
		return MessageWaitState.NONE;
	},
	
	startPage: function() {
		if (this._isForceAuto) {
			this._isAutoSelectAction = false;
		}
	},
	
	endPage: function() {
		if (this._isForceAuto) {
			this._isWaitMode = true;
		}
	},
	
	isPageAutoChange: function() {
		if (this._isForceAuto && this._isAutoSelectAction) {
			return true;
		}
		
		return false;
	},
	
	doEndWaitAction: function() {
		this._isAutoSelectAction = true;
	},
	
	isAutoMode: function() {
		return this._isWaitMode || this._isAutoSelectAction;
	}
}
);

WaitParts.Speed = defineObject(BaseWaitParts,
{
	_value: 0,
	_maxValue: 0,
	
	setupWaitParts: function(parentMessageAnalyzer) {
		this._value = 0;
		this._maxValue = parentMessageAnalyzer.getMessageSpeed();
	
		BaseWaitParts.setupWaitParts.call(this, parentMessageAnalyzer);
	},
	
	moveWaitParts: function() {
		if (this._parentMessageAnalyzer.isMessageDirect()) {
			return MoveResult.END;
		}
		
		if (++this._value >= this._maxValue) {
			this._value = 0;
			return MoveResult.END;
		}
		
		return MoveResult.CONTINUE;
	},
	
	checkWaitParts: function(parserInfo, isPageCut) {
		if (parserInfo.speed !== -1) {
			// メッセージスピードを設定
			this._parentMessageAnalyzer.setMessageSpeed(parserInfo.speed);
			
			if (this._parentMessageAnalyzer.isMessageDirect() || isPageCut) {
				// 次の文字から解析が行われるようにする
				this._parentMessageAnalyzer.getCoreAnalyzer().advanceStep();
					
				this._parentMessageAnalyzer.cutPage();
					
				// この時点で1ページ読み終えたため、直ちに次の文字に進む必要はない
				return MessageWaitState.WAIT;
			}
			else {
				this._maxValue = this._parentMessageAnalyzer.getMessageSpeed();
			}
			
			parserInfo.speed = -1;
		}
		
		return MessageWaitState.NONE;
	}
}
);

// 実際に文字を処理する。
// 全ての文字を理解できる形にするために、
// 変数はVariableReplacerで置換され、制御文字はTextParserで置換される。
var CoreAnalyzer = defineObject(BaseObject,
{
	_currentIndex: 0,
	_rowCount: 0,
	_baseIndex: 0,
	_fontSize: 0,
	_parserInfo: null,
	_maxRowCount: 0,
	_textArray: null,
	_textParser: null,
	
	setCoreAnalyzerData: function(text, parserInfo) {
		this._currentIndex = 0;
		this._rowCount = 0;
		this._baseIndex = 0;
		this._fontSize = parserInfo.defaultFont.getSize();
		this._parserInfo = parserInfo;
		this._maxRowCount = MessageRowCount;
		
		// _textArrayと_textParserを作成する
		this._startParse(text, parserInfo);
	},
	
	moveCoreAnalyzer: function() {
		var c;
		var result = MessageAnalyzerState.NONE;
		
		if (this._currentIndex >= this._textArray.length) {
			return MessageAnalyzerState.ENDTEXT;
		}
		
		this._textParser.checkParserInfo(this._currentIndex);
		
		// _currentIndexで識別される文字を取得
		c = this._textArray.charAt(this._currentIndex);
		
		if (c === '\n') {
			if (++this._rowCount === this._maxRowCount) {
				// 最大行まで調べたため、1ページ処理したものと扱う
				result = MessageAnalyzerState.READBLOCK;
			}
		}
		
		return result;
	},
	
	drawCoreAnalyzer: function(xStart, yStart) {
		var i, j, x, y, c, start, count, color, size, font, prevFont;
		var rowCount = 0;
		var width = this.getCharSpaceWidth();
		var height = this.getCharSpaceHeight();
		var drawInfo = {};
		
		if (this._parserInfo === null) {
			return;
		}
		
		x = xStart;
		y = yStart;
		
		start = this._baseIndex;
		count = this._currentIndex;
		
		color = this._parserInfo.defaultColor;
		font = this._parserInfo.defaultFont;
		prevFont = font;
		
		j = 0;
		for (i = start; i < count; i++) {
			this._textParser.checkDrawInfo(i, drawInfo);
			
			c = this._textArray.charAt(i);
			if (c === '\n') {
				// 文字が改行だったため、処理した行数を増やす
				rowCount++;
				
				// 文字のx座標表示位置を初期化
				x = xStart;
				
				// 文字のy座標表示位置をずらす
				y += height;
				
				// 実際に文字を一行に表示した回数を初期化
				j = 0;
				continue;
			}
			
			// 制御文字によって変更されることがあるため、毎回取得する
			color = this._getTextColor(drawInfo);
			font = this._getTextFont(drawInfo);
			
			// フォントが変化した場合
			if (font !== prevFont) {
				size = font.getSize();
				width = size;
				height = size + 10;
				
				prevFont = font;
			}	
			
			// 表示最大文字数の制限がない、もしくは現在の表示回数が最大数より小さい場合は文字を描画
			if (this._parserInfo.maxTextLength === -1 || j < this._parserInfo.maxTextLength) {
				this._drawText(x, y, c, color, font);
				j++;
			}
			
			if (Miscellaneous.isSingleTextSpace(c)) {
				x += (Math.floor(width / 2));
			}
			else {
				x += width;
			}
		}
	},
	
	nextCoreAnalyzer: function() {
		this._baseIndex = this._currentIndex;
		this._rowCount = 0;
	},
	
	advanceStep: function() {
		this._currentIndex++;
	},
	
	setMaxRowCount: function(maxRowCount) {
		this._maxRowCount = maxRowCount;
	},

	getCurrentIndex: function() {
		return this._currentIndex;
	},

	getEnsureText: function() {
		return this._textArray;
	},
	
	getCharSpaceWidth: function() {
		return this._fontSize;
	},
	
	getCharSpaceHeight: function() {
		return this._fontSize + 10;
	},
	
	_startParse: function(text, parserInfo) {
		var variableReplacer = createObject(VariableReplacer);
		var textParser = createObject(TextParser);
		
		// 変数を置き換える
		text = variableReplacer.startReplace(text);
		
		// 制御文字を置き換える
		this._textArray = textParser.startReplace(text, parserInfo);
		this._textParser = textParser;
	},
	
	_drawText: function(x, y, c, color, font) {
		TextRenderer.drawSingleCharacter(x, y, c, color, font);
	},
	
	_getTextColor: function(drawInfo) {
		var color = this._parserInfo.defaultColor;
		
		if (typeof drawInfo.currentColor !== 'undefined') {
			color = drawInfo.currentColor;
		}
		
		return color;
	},
	
	_getTextFont: function(drawInfo) {
		var font = this._parserInfo.defaultFont;
		
		if (typeof drawInfo.currentFont !== 'undefined') {
			font = drawInfo.currentFont;
		}
		
		return font;
	}
}
);

// startReplaceに指定されるテキストから制御文字を置換したテキストを生成し、それを返す
var TextParser = defineObject(BaseObject,
{
	_variableArray: null,
	_controlObjectArray: null,
	_parserInfo: null,

	startReplace: function(text, parserInfo) {
		var i, count, n, min, result;
		var s = text;
		var arr = [];
		var index = -1;
		
		this._parserInfo = parserInfo;
		this._controlObjectArray = [];
		this._variableArray = [];
		this._configureVariableObject(this._variableArray);
		
		arr = this._variableArray;
		
		for (;;) {
			// テキスト上のインデックス
			min = 999;
			
			// 文字列上のインデックス
			index = -1;
		
			count = arr.length;
			for (i = 0; i < count; i++) {
				n = s.search(arr[i].getKey());
				if (n === -1) {
					continue;
				}
				
				// 前方に存在する制御文字から処理する
				if (n < min) {
					// 文字が先頭から何番目に存在するかを保存
					min = n;
					index = i;
				}
			}
			
			if (index === -1) {
				break;
			}
			
			// 変換結果を受け取る
			result = arr[index].startParser(s, min, this._controlObjectArray);
			
			// 実際に変換を行う
			s = s.replace(arr[index].getKey(), result);
		}
		
		return s;
	},
	
	// move系から呼ばれる
	checkParserInfo: function(index) {
		var i;
		var count = this._variableArray.length;
		
		for (i = 0; i < count; i++) {
			// 指定インデックスに対する処理を行わせる
			this._variableArray[i].checkParserInfo(index, this._controlObjectArray, this._parserInfo);
		}
	},
	
	// draw系から呼ばれる
	checkDrawInfo: function(index, drawInfo) {
		var i;
		var count = this._variableArray.length;
		
		count = this._variableArray.length;
		for (i = 0; i < count; i++) {
			// 指定インデックスに対する処理を行わせる
			this._variableArray[i].checkDrawInfo(index, this._controlObjectArray, drawInfo);
		}
	},
	
	_configureVariableObject: function(groupArray) {
		// 1つの制御文字に対して、1つのオブジェクトが存在することになっている。
		// たとえば、/crを置換するのはColorParserという具合になる。
		groupArray.appendObject(ControlVariable.Color);
		groupArray.appendObject(ControlVariable.Font);
		groupArray.appendObject(ControlVariable.WaitShort);
		groupArray.appendObject(ControlVariable.WaitMiddle);
		groupArray.appendObject(ControlVariable.WaitLong);
		groupArray.appendObject(ControlVariable.Auto);
		groupArray.appendObject(ControlVariable.Speed);
		
		if (this._parserInfo.isVoiceIncluded) {
			groupArray.appendObject(ControlVariable.Voice);
		}
	}
}
);

var BaseControlVariable = defineObject(BaseObject,
{
	startParser: function(text, index, objectArray) {
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
	},
	
	checkDrawInfo: function(index, objectArray, drawInfo) {
	},
	
	getObjectFromIndex: function(index, objectArray, parentObject) {
		var i;
		var count = objectArray.length;
		
		for (i = 0; i < count; i++) {
			if (objectArray[i].index === index && objectArray[i].parentObject === parentObject) {
				return objectArray[i];
			}
		}
		
		return null;
	}
}
);

var ControlVariable = {};

ControlVariable.Color = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var colorId = c[1];
		var color = this.getColor(colorId);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.color = color;
		objectArray.push(obj);
		
		return '';
	},
	
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		if (typeof obj.color === 'undefined') {
			return;
		}
		
		drawInfo.currentColor = obj.color;
	},
	
	getColor: function(colorId) {
		var c = [0xffffff, 0x10efff, 0xefff00, 0x20ff40, 
				0xff5040, 0xff10ef, 0x7f7f8f, 0x0];
		var count = c.length;
		
		if (colorId < 0 || colorId > count - 1) {
			return c[0];
		}
		
		return c[colorId];
	},
	
	getKey: function() {
		var key = /\\C\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Font = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var fontIndex = c[1];
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.fontIndex = fontIndex;
		objectArray.push(obj);
		
		return '';
	},
	
	checkDrawInfo: function(index, objectArray, drawInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		drawInfo.currentFont = root.getBaseData().getFontList().getData(obj.fontIndex);
	},
	
	getKey: function() {
		var key = /\\font\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.WaitShort = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.wait = 24;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.wait;
	},
	
	getKey: function() {
		var key = /\\\./;
		
		return key;
	}
}
);

ControlVariable.WaitMiddle = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.wait = 46;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.wait;
	},
	
	getKey: function() {
		var key = /\\_/;
		
		return key;
	}
}
);

ControlVariable.WaitLong = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var wait= Number(c[1]);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.wait = wait;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.wait = obj.wait;
	},
	
	getKey: function() {
		var key = /\\wa\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Auto = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var wait= Number(c[1]);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.autoWait = wait;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.autoWait = obj.autoWait;
	},
	
	getKey: function() {
		var key = /\\at\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Speed = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var speed = Number(c[1]);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.speed = speed;
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		parserInfo.speed = obj.speed;
	},
	
	getKey: function() {
		var key = /\\sp\[(\d+)\]/;
		
		return key;
	}
}
);

ControlVariable.Voice = defineObject(BaseControlVariable,
{
	startParser: function(text, index, objectArray) {
		var key = this.getKey();
		var c = text.match(key);
		var obj = {};
		
		obj.index = index;
		obj.parentObject = this;
		obj.name = c[1];
		objectArray.push(obj);
		
		return '';
	},
	
	checkParserInfo: function(index, objectArray, parserInfo) {
		var fileName;
		var ext = ['ogg', 'mp3', 'wav'];
		var obj = this.getObjectFromIndex(index, objectArray, this);
		
		if (obj === null) {
			return;
		}
		
		fileName = obj.name + '.' + ext[this._getVoiceExtIndex()];
		
		root.getMaterialManager().voicePlay(this._getVoiceCategory(), fileName, 1);
		
		parserInfo.voiceRefId = 1;
	},
	
	getKey: function() {
		var key = /\\vo\[(.+?)\]/;
		
		return key;
	},
	
	_getVoiceCategory: function() {
		return DataConfig.getVoiceCategoryName();
	},
	
	_getVoiceExtIndex: function() {
		return DataConfig.getVoiceExtIndex();
	}
}
);

// startReplaceに指定されるテキストから変数を置換したテキストを生成し、それを返す
var VariableReplacer = defineObject(BaseObject,
{
	_variableArray: null,

	startReplace: function(text) {
		var i, count, n, min, result;
		var s = text;
		var arr = [];
		var index = -1;
		
		this._variableArray = [];
		this._configureVariableObject(this._variableArray);

		arr = this._variableArray;
		
		for (;;) {
			min = 999;
			index = -1;
		
			count = arr.length;
			for (i = 0; i < count; i++) {
				n = s.search(arr[i].getKey());
				if (n === -1) {
					continue;
				}
				
				// 前方に存在する制御文字から処理する
				if (n < min) {
					min = n;
					index = i;
				}
			}
			
			if (index === -1) {
				break;
			}
			
			// 変換結果を受け取る
			result = arr[index].getReplaceValue(s);
			
			// 実際に変換を行う
			s = s.replace(arr[index].getKey(), result);
		}
		
		return s;
	},
	
	_configureVariableObject: function(groupArray) {
		// 1つの変数に対して、1つのオブジェクトが存在することになっている。
		// たとえば、/actを置換するのはActVariableという具合になる。
		groupArray.appendObject(DataVariable.Act);
		groupArray.appendObject(DataVariable.Pdb);
		groupArray.appendObject(DataVariable.Cdb);
		groupArray.appendObject(DataVariable.Wdb);
		groupArray.appendObject(DataVariable.Idb);
		groupArray.appendObject(DataVariable.Sdb);
		groupArray.appendObject(DataVariable.Turn);
		groupArray.appendObject(DataVariable.Gold);
		groupArray.appendObject(DataVariable.Bonus);
		groupArray.appendObject(DataVariable.Va1);
		groupArray.appendObject(DataVariable.Va2);
		groupArray.appendObject(DataVariable.Va3);
		groupArray.appendObject(DataVariable.Va4);
		groupArray.appendObject(DataVariable.Va5);
		groupArray.appendObject(DataVariable.Va6);
	}
}
);

var BaseDataVariable = defineObject(BaseObject,
{
	_variableArray: null,
	
	getReplaceValue: function(text) {
		var i, data;
		var id = this.getIdFromKey(text);
		var result = '';
		var list = this.getList();
		var count = list.getCount();
		
		for (i = 0; i < count; i++) {
			data = list.getData(i);
			if (data.getId() === id) {
				result = data.getName();
				break;
			}
		}
		
		return result;
	},
	
	getList: function() {
		return null;
	},
	
	getKey: function() {
		return null;
	},
	
	getVariableValue: function(text, n) {
		var id = this.getIdFromKey(text);
		var table = root.getMetaSession().getVariableTable(n - 1);
		var index = table.getVariableIndexFromId(id);
		
		return table.getVariable(index);
	},
	
	getIdFromKey: function(text) {
		var key = this.getKey();
		var c = text.match(key);
		
		return Number(c[1]);
	}
}
);

var DataVariable = {};

DataVariable.Act = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var unit = root.getCurrentSession().getActiveEventUnit();
		var result = '';
		
		if (unit !== null) {
			result = unit.getName();
		}
		
		return result;
	},
	
	getKey: function() {
		var key = /\\act/;
		
		return key;
	}
}
);

DataVariable.Pdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getPlayerList();
	},
	
	getKey: function() {
		var key = /\\pdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Cdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getClassList();
	},
	
	getKey: function() {
		var key = /\\cdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Wdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getWeaponList();
	},
	
	getKey: function() {
		var key = /\\wdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Idb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getItemList();
	},
	
	getKey: function() {
		var key = /\\idb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Sdb = defineObject(BaseDataVariable,
{
	getList: function() {
		return root.getBaseData().getSkillList();
	},
	
	getKey: function() {
		var key = /\\sdb\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Turn = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var result = root.getCurrentSession().getTurnCount().toString();
		
		return result;
	},
	
	getKey: function() {
		var key = /\\T/;
		
		return key;
	}
}
);

DataVariable.Gold = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var result = root.getMetaSession().getGold().toString();
		
		return result;
	},
	
	getKey: function() {
		var key = /\\G/;
		
		return key;
	}
}
);

DataVariable.Bonus = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		var result = root.getMetaSession().getBonus().toString();
		
		return result;
	},
	
	getKey: function() {
		var key = /\\B/;
		
		return key;
	}
}
);

DataVariable.Va1 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 1);
	},
	
	getKey: function() {
		var key = /\\va1\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va2 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 2);
	},
	
	getKey: function() {
		var key = /\\va2\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va3 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 3);
	},
	
	getKey: function() {
		var key = /\\va3\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va4 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 4);
	},
	
	getKey: function() {
		var key = /\\va4\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va5 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 5);
	},
	
	getKey: function() {
		var key = /\\va5\[(\d+)\]/;
		
		return key;
	}
}
);

DataVariable.Va6 = defineObject(BaseDataVariable,
{
	getReplaceValue: function(text) {
		return this.getVariableValue(text, 6);
	},
	
	getKey: function() {
		var key = /\\va6\[(\d+)\]/;
		
		return key;
	}
}
);
