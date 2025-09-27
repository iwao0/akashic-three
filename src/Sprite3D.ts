import * as THREE from "three";

let assetBasePath = "/node_modules/@iwao0/akashic-three/assets/";

function resolveAssetPath(assetId: string): string {
	return assetBasePath + assetId;
}

/**
 * Sprite3Dのコンストラクタに渡すことができるパラメータ
 */
export interface Sprite3DParameterObject extends g.EParameterObject {
	/**
     * 画像として使う `Surface` または `ImageAsset` 。
     */
	src?: g.Surface | g.ImageAsset;
	/**
     * `surface` の描画対象部分の幅。
     * 描画はこの値を `this.width` に拡大または縮小する形で行われる。
     * 省略された場合、値に `width` があれば `width` 、なければ `src.width` 。
     * @default width || src.width
     */
	srcWidth?: number;
	/**
     * `surface` の描画対象部分の高さ。
     * 描画はこの値を `this.height` に拡大または縮小する形で行われる。
     * 省略された場合、値に `height` があれば `height` 、なければ `src.height` 。
     * @default height || src.height
     */
	srcHeight?: number;
	/**
     * `surface` の描画対象部分の左端。
     * @default 0
     */
	srcX?: number;
	/**
     * `surface` の描画対象部分の上端。
     * @default 0
     */
	srcY?: number;
}

/**
 * Three.jsの描画内容を表示するためのスプライト
 * @description
 * このオブジェクトのrendererを使用してThree.jsのsceneを描画する
 */
export class Sprite3D extends g.Sprite {
	surface?: g.Surface;
	renderer?: THREE.WebGLRenderer;
	protected context?: WebGL2RenderingContext;

	/**
	 * Sprite3Dで使用されるアセットのパス一覧
	 * @description
	 * g.SceneのコンストラクタのassetPathsに渡してください。
	 * @param basePath 子モジュールとしてakashic-threeを使用する時に、
	 * ベースパスを変更するために使用する
	 * @returns アセットのパス一覧
	 */
	static getAssetPaths(basePath?: string): string[] {
		if (basePath != null) {
			assetBasePath = basePath;
		}
		return [
			resolveAssetPath("warning.png")
		];
	}

	/**
	 * 3D表示に対応しているか
	 * @returns 対応している場合true,　してない場合false
	 */
	get isSupported(): boolean {
		return this.context != null;
	}

	/**
     * 各種パラメータを指定して `Sprite3D` のインスタンスを生成する。
     * @param param `Sprite3D` に設定するパラメータ
     */
	constructor(params: Sprite3DParameterObject) {
		if (!params.width) {
			params.width = g.game.width;
		}
		if (!params.height) {
			params.height = g.game.height;
		}
		const surface = g.game.resourceFactory.createSurface(
			params.width,
			params.height
		);
		params.src = surface;
		super(params as g.SpriteParameterObject);
		this.surface = surface;

		if (!this.surface._drawable) {
			return;
		}
		this.context = this.surface._drawable.getContext("webgl2");

		if (!this.context) {
			return;
		}

		const canvas = this.surface._drawable as HTMLCanvasElement;
		this.renderer = new THREE.WebGLRenderer({
			canvas
		});
	}

	/**
	 * 3Dに対応していない時に表示する画像を取得する
	 * @returns 画像アセット
	 */
	getWarningImage(): g.ImageAsset {
		return this.scene.asset.getImage(
			resolveAssetPath("warning.png")
		);
	}

	/**
     * このエンティティを破棄する。
     * デフォルトでは利用している `Surface` の破棄は行わない点に注意。
     * @param destroySurface trueを指定した場合、このエンティティが抱える `Surface` も合わせて破棄する
     */
	override destroy(destroySurface?: boolean): void {
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer = undefined;
		}
		if (this.surface) {
			this.surface.destroy();
			this.surface = undefined;
		}
		super.destroy(destroySurface);
	}
}
