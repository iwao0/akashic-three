import * as THREE from "three";

export class Scene3D extends THREE.Scene {
	renderer: THREE.WebGLRenderer;
	camera: THREE.PerspectiveCamera;
	box: THREE.Mesh;

	constructor(renderer: THREE.WebGLRenderer) {
		super();
		this.renderer = renderer;

		// カメラを作成
		this.camera = new THREE.PerspectiveCamera(
			45,
			g.game.width / g.game.height
		);
		this.camera.position.set(0, 0, 3);

		// ライトを作成
		const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.0);
		this.add(ambientLight);

		// 箱を作成
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshNormalMaterial();
		this.box = new THREE.Mesh(geometry, material);
		this.add(this.box);
	}

	/**
	 * 表示内容を更新する
	 */
	update(): void {
		this.box.rotation.y += 0.01;
		this.renderer.render(this, this.camera);
	}
}
