import { Sprite3D } from "@iwao0/akashic-three";
import { GameMainParameterObject } from "./parameterObject";
import { Scene3D } from "./Scene3D";

export function main(param: GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: [],
		assetPaths: [
			...Sprite3D.getAssetPaths()
		]
	});
	let time = 60; // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit; // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 };

	scene.onLoad.add(() => {
		const sprite3d = new Sprite3D({
			scene: scene,
			width: g.game.width,
			height: g.game.height
		});

		if (!sprite3d.isSupported) {
			const image = sprite3d.getWarningImage();
			const warning = new g.Sprite({
				scene: scene,
				src: image,
				x: g.game.width / 2,
				y: g.game.height - 60,
				anchorX: 0.5,
				anchorY: 1
			});
			scene.append(warning);
			return;
		}

		scene.append(sprite3d);

		// Three.jsの描画用オブジェクト
		const scene3d = new Scene3D(sprite3d.renderer);

		// フォントの生成
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 48
		});

		// 残り時間表示用ラベル
		const timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			textColor: "white",
			x: g.game.width - 40,
			y: 40,
			anchorX: 1
		});
		scene.append(timeLabel);

		const updateHandler = (): void => {
			scene3d.update();
			if (time <= 0) {
				// カウントダウンを止めるためにこのイベントハンドラを削除します
				scene.onUpdate.remove(updateHandler);
			}
			// カウントダウン処理
			time -= 1 / g.game.fps;
			timeLabel.text = "TIME: " + Math.ceil(time);
			timeLabel.invalidate();
		};
		scene.onUpdate.add(updateHandler);
	});
	g.game.pushScene(scene);
}
