
// ゲームの初期化段階で一度だけ呼ばれる。
// この関数のみ、rootを参照できない。
function ScriptCall_Initialize(startupInfo)
{
}
	
// ゲームウインドウが表示される直前で一度だけ呼ばれる
function ScriptCall_Setup()
{
	SetupControl.setup();
}

// 新しいシーン、またはイベントコマンドを開始する際に呼ばれる
function ScriptCall_Enter(scene, commandType)
{
	var result;
	
	if (scene === SceneType.EVENT) {
		result = EventCommandManager.enterEventCommandManagerCycle(commandType);
	}
	else {
		result = SceneManager.enterSceneManagerCycle(scene);
	}
	
	return result;
}

// MoveScriptを始めとするmoveという文字列から始まるメソッドでは、データの更新処理を行う。
// たとえば、ユニットの位置を変更する場合は、x座標とy座標を表すメンバの値を変更する必要があるが、
// そうした変数の更新処理を行う。
// また、ユーザー入力する検出する処理も行う。
// 描画処理は一切行わないようにし、描画はdraw系メソッドに任せるようにする。
// move系メソッドでは、必ず戻り値を返さなければならない。
// 通常はデータの更新処理が完了した場合にMoveResult.ENDを返し、
// 更新がまだ完了していない場合にMoveResult.CONTINUEを返す。
// ただし、独自の戻り値を返しても問題はない。
function ScriptCall_Move(scene, commandType)
{
	var result;
	
	if (scene === SceneType.EVENT) {
		if (commandType === root.getEventCommandType()) {
			result = EventCommandManager.moveEventCommandManagerCycle(commandType);
		}
		else {
			result = EventCommandManager.backEventCommandManagerCycle(commandType);
		}
	}
	else {
		if (scene === root.getCurrentScene() || SceneManager.isForceForeground()) {
			result = SceneManager.moveSceneManagerCycle(scene);
		}
		else {
			result = SceneManager.backSceneManagerCycle(scene);
		}
	}
	
	MouseControl.moveAutoMouse();

	return result;
}

// DrawScriptを始めとするdrawという文字列から始まるメソッドでは、データの描画処理を行う。
// move系メソッドで更新した変数にしたがって描画を行うのがdraw系メソッドであるため、
// draw系メソッドで何らかの変数の値を変更してはならない。
// draw系メソッドが描画のみを行う性質から、draw系メソッドで何も処理も行わなくても、
// 画面に何も描画が行われないだけで、ゲーム自体は進むことになる。
// この性質から、ゲームの進行に問題がある場合はmove系メソッドを確認し、
// 描画に問題がある場合はdraw系メソッドを確認すればよいことになる。
// draw系メソッドでは戻り値を返す必要はない。
function ScriptCall_Draw(scene, layerNumber, commandType)
{
	if (layerNumber === 0) {
		if (scene !== SceneType.REST) {
			MapLayer.drawMapLayer();
		}
	}
	else if (layerNumber === 1) {
		SceneManager.drawSceneManagerCycle(scene);
		root.drawAsyncEventData();
	}
	else {
		EventCommandManager.drawEventCommandManagerCycle(commandType);
	}
}

// セーブファイルのロードが完了した際に呼ばれる
function ScriptCall_Load()
{
	// 制御を返すとEnterScriptが呼ばれる
}

function ScriptCall_Reset()
{
	MessageViewControl.reset();
}

function ScriptCall_CheckInput(reason)
{
	var result = false;
	
	if (reason === 0) {
		result = InputControl.isSelectAction();
	}
	else if (reason === 1) {
		result = InputControl.isCancelState();
	}
	else if (reason === 2) {
		result = InputControl.isStartAction();
	}
	
	return result;
}

// マウスでユニットを移動させり、マウスでユニットを撃破した際に呼ばれる
function ScriptCall_DebugAction()
{
	SceneManager.getActiveScene().notifyAutoEventCheck();
}

// マウス操作ができる状態かを確認する際に呼ばれる
function ScriptCall_CheckDebugAction()
{
	return SceneManager.getActiveScene().isDebugMouseActionAllowed();
}

// メッセージ消去が必要になった際に呼ばれる
function ScriptCall_EraseMessage(value)
{
	EventCommandManager.eraseMessage(value);
}

// イベントでユニットが登場する際に呼ばれる
function ScriptCall_AppearEventUnit(unit)
{
	UnitProvider.setupFirstUnit(unit);
	SkillChecker.addAllNewSkill(unit);
}

// クラスの条件表示のキーワードが満たされる場合に呼ばれる
function ScriptCall_DrawCustomCharChip(cpData)
{
	CustomCharChipGroup.drawCustomCharChipGroup(cpData);
}

// イベント条件で武器を参照する際に呼ばれる
function ScriptCall_GetWeapon(unit)
{
	return ItemControl.getEquippedWeapon(unit);
}

// イベント条件でアイテムの所持判定をする際に呼ばれる
function ScriptCall_CheckItem(unit, item)
{
	return ItemControl.isItemUsable(unit, item);
}

// マーキング時に呼ばれる
function ScriptCall_GetUnitAttackRange(unit)
{
	var rangePanel = createObject(UnitRangePanel);
	
	return rangePanel.getUnitAttackRange(unit);
}

// イベントによるユニットの移動時に呼ばれる
function ScriptCall_GetUnitMoveCource(unit, xGoal, yGoal)
{
	var goalIndex = CurrentMap.getIndex(xGoal, yGoal);
	var simulator = root.getCurrentSession().createMapSimulator();
	
	simulator.disableMapUnit();
	simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
	
	return CourceBuilder.createLongCource(unit, goalIndex, simulator);
}
