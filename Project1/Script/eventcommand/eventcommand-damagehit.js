
var DamageHitMode = {
	ANIME: 0,
	ERASE: 1,
	FLOW: 2
};

var DamageHitEventCommand = defineObject(BaseEventCommand,
{
	_launchUnit: null,
	_targetUnit: null,
	_damageValue: 0,
	_eraseCounter: null,
	_damageHitFlow: null,
	_dynamicAnime: null,
	
	enterEventCommandCycle: function() {
		this._prepareEventCommandMemberData();
		
		if (!this._checkEventCommand()) {
			return EnterResult.NOTENTER;
		}
		
		return this._completeEventCommandMemberData();
	},
	
	moveEventCommandCycle: function() {
		var mode = this.getCycleMode();
		var result = MoveResult.CONTINUE;
		
		if (mode === DamageHitMode.ANIME) {
			result = this._moveAnime();
		}
		else if (mode === DamageHitMode.CHECK) {
			result = this._moveCheck();
		}
		else if (mode === DamageHitMode.ERASE) {
			result = this._moveErase();
		}
		else if (mode === DamageHitMode.FLOW) {
			result = this._moveFlow();
		}
		
		return result;
	},
	
	drawEventCommandCycle: function() {
		var mode = this.getCycleMode();
		
		if (mode === DamageHitMode.ANIME) {
			this._drawAnime();		
		}
		if (mode === DamageHitMode.ERASE) {
			this._drawErase();
		}
		else if (mode === DamageHitMode.FLOW) {
			this._drawFlow();
		}
	},
	
	isEventCommandSkipAllowed: function() {
		// ここでtrueを返すことで、スキップを常に許可できない。
		// 対象ユニットが重要アイテムを持っており、さらにストックも一杯である場合などは、
		// アイテムの確認を行うことは必須になる。
		// よって、スキップ確認はANIMEとERASEで明示的に行う。
		return false;
	},
	
	_prepareEventCommandMemberData: function() {
		var eventCommandData = root.getEventCommandObject();
		
		this._launchUnit = eventCommandData.getLaunchUnit();
		this._targetUnit = eventCommandData.getTargetUnit();
		if (this._targetUnit !== null) {
			this._damageValue = this._getDamageValue();
		}
		this._eraseCounter = createObject(EraseCounter);
		this._dynamicAnime = createObject(DynamicAnime);
		this._damageHitFlow = createObject(DamageHitFlow);
	},
	
	_checkEventCommand: function() {
		if (this._targetUnit === null || this._targetUnit.getAliveState() !== AliveType.ALIVE) {
			return false;
		}
		
		return true;
	},
	
	_completeEventCommandMemberData: function() {
		if (this.isSystemSkipMode()) {
			this._setDamage();
			if (!this._startDamageHitFlow()) {
				return EnterResult.NOTENTER;
			}
		}
		else {
			// ダメージアニメ表示などの通常の処理が行われていく
			this._startDamageHitAnime();
			this.changeCycleMode(DamageHitMode.ANIME);
		}
		
		return EnterResult.OK;
	},
	
	_moveAnime: function() {
		if (this._checkSkip()) {
			this._setDamage();
			if (!this._startDamageHitFlow()) {
				return MoveResult.END;
			}
		}
		else {
			if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
				// ダメージを与える。ここで対象のHPが変化する
				this._setDamage();
				
				// 対象が死亡した場合
				if (this._isLosted()) {
					// ユニットの消去処理で明示的にユニットを描画するために、デフォルト描画を無効
					this._targetUnit.setInvisible(true);
					this.changeCycleMode(DamageHitMode.ERASE);
				}
				else {
					// 死亡しなかった場合は、処理を続行しない
					return MoveResult.END;
				}
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveErase: function() {
		if (this._checkSkip()) {
			if (!this._startDamageHitFlow()) {
				return MoveResult.END;
			}
		}
		else {
			if (this._eraseCounter.moveEraseCounter() !== MoveResult.CONTINUE) {
				if (!this._startDamageHitFlow()) {
					return MoveResult.END;
				}
			}
		}
		
		return MoveResult.CONTINUE;
	},
	
	_moveFlow: function() {
		return this._damageHitFlow.moveDamageHitFlowCycle();
	},
	
	_drawAnime: function() {
		this._dynamicAnime.drawDynamicAnime();
	},
	
	_drawErase: function() {
		var unit = this._targetUnit;
		var x = LayoutControl.getPixelX(unit.getMapX());
		var y = LayoutControl.getPixelY(unit.getMapY());
		var alpha = this._eraseCounter.getEraseAlpha();
		var unitRenderParam = StructureBuilder.buildUnitRenderParam();
		var colorIndex = unit.getUnitType();
		var animationIndex = MapLayer.getAnimationIndexFromUnit(unit);
		
		if (unit.isWait()) {
			colorIndex = 3;
		}
		
		if (unit.isActionStop()) {
			animationIndex = 1;
		}
		
		unitRenderParam.colorIndex = colorIndex;
		unitRenderParam.animationIndex = animationIndex;
		unitRenderParam.alpha = alpha;
		
		UnitRenderer.drawScrollUnit(unit, x, y, unitRenderParam);
	},
	
	_drawFlow: function() {
		this._damageHitFlow.drawDamageHitFlowCycle();
	},
	
	_startDamageHitFlow: function() {
		if (this._damageHitFlow.enterDamageHitFlowCycle(this._launchUnit, this._targetUnit) === EnterResult.NOTENTER) {
			return false;
		}
		
		// EnterResult.OKが返った場合は何らかの描画処理が必要になるため、スキップを無効にする
		root.setEventSkipMode(false);
		
		this.changeCycleMode(DamageHitMode.FLOW);
		
		return true;
	},
	
	_checkSkip: function() {
		if (InputControl.isStartAction()) {
			root.setEventSkipMode(true);
			return true;
		}
		
		return false;
	},
	
	_isLosted: function() {
		return this._targetUnit.getHp() <= 0;
	},
	
	_setDamage: function() {
		var hp;
		var unit = this._targetUnit;
		var damage = this._damageValue;
		
		if (damage < 1) {
			return;
		}
		
		// ダメージ分だけユニットのhpを減らす
		hp = unit.getHp() - damage;
		if (hp <= 0) {
			// ユニットが不死身である場合は、hpを1でとどめる
			if (unit.isImmortal()) {
				unit.setHp(1);
			}
			else {
				unit.setHp(0);
				// 状態を死亡に変更する
				DamageControl.setDeathState(unit);
			}	
		}
		else {
			unit.setHp(hp);
		}
	},
	
	_getDamageValue: function() {
		var eventCommandData = root.getEventCommandObject();
		var damage = eventCommandData.getDamageValue();
		var type = eventCommandData.getDamageType();
		
		return Calculator.calculateDamageValue(this._targetUnit, damage, type, 0);
	},
	
	_startDamageHitAnime: function() {
		var x = LayoutControl.getPixelX(this._targetUnit.getMapX());
		var y = LayoutControl.getPixelY(this._targetUnit.getMapY());
		var anime = root.getEventCommandObject().getDamageAnime();
		var pos = LayoutControl.getMapAnimationPos(x, y, anime);
		
		this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
	}
}
);
