# akashic-three

[![NPM Package][npm]][npm-url]

**akashic-three** は、Three.jsを導入するためのakashicゲーム向けプラグインです。

akashicゲームへThree.jsを導入するためには、ソースコードの書き換え等の煩雑な作業が必要になることもあります。そういった作業を自動で実行し、簡単に導入するためのパッケージです。

TypeScriptへの対応も簡単にできるようにしています。

TypeScriptのサンプルは [sample_ts](./sample_ts) ディレクトリを参照してください。

## 利用方法

### インストール

[akashic-cli](https://github.com/akashic-games/akashic-cli)をインストールした後、

```sh
akashic install @iwao0/akashic-three
npx @iwao0/akashic-three
```

でインストールできます。


インストール後、**akashic-three.json**という名前の設定ファイルが追加されます。  
このファイルはThree.jsのアドオンの追加時に必要となるので削除しないでください。

### tsconfig.jsonの編集

TypeScriptを使用している場合は、tsconfig.jsonのcompilerOptions.libを次のように変更してください。

```javascript
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
  }
}
```


### コンテンツへの適用

```javascript
const { Sprite3D } = require("@iwao0/akashic-three");

const scene = new g.Scene({
	game: g.game,
	// Sprite3Dに含まれている画像素材を追加する
	assetPaths: [
		...Sprite3D.getAssetPaths()
	]
});

const sprite3d = new Sprite3D({
  scene: scene,
  width: g.game.width,
  height: g.game.height
});

if (!sprite3d.isSupported) {
  // 端末が3Dに対応していない時はメッセージを表示します
  // ゲームは実行されません
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

// ここから、Three.jsを使ったコンテンツを作成します
// レンダリング時はsprite3d.rendererを使用してください
```

### アドオンの追加

Three.jsは動作に必要な最小限のJavaScriptファイルと、その他のファイル（アドオン）に分けて配布されています。

- 動作に必要なファイル: build/three.cjs
- アドオン: examples以下のファイル

アドオンを使用する場合、game.jsonのglobalScriptsにファイル名を指定する必要がありますが、どのファイルが必要になるか確認するのは手間がかかります。

**akashic-three**はこの作業を簡単にするためのコマンドも含んでいます。

例：OBJLoaderを追加する場合

```sh
npx @iwao0/akashic-three add OBJLoader
```

このコマンドを実行するとgame.jsonが更新され、アドオンが使用可能になります。  
削除する場合は、

```sh
npx @iwao0/akashic-three remove OBJLoader
```

と入力します。全て削除する場合は、

```sh
npx @iwao0/akashic-three remove all
```

で初期状態に戻すことができます。

## 問題が起こった時

### TypeScriptのコンパイル時にGPUTextureが見つからないというエラーが表示される

tsconfig.jsonに次の項目を追加してください。

```javascript
{
  "files": [
    "node_modules/@iwao0/akashic-three/GPUTexture.d.ts"
  ]
}
```


### 実行時にMath.random()を使わないでというエラーが表示される

Three.jsの内部でUUIDを作成する時に使用されているため、akashicの乱数生成器に置き換えるのは困難です。表示を抑制するためには、sandbox.config.jsを作成し、次のように入力してください。

```javascript
module.exports = {
  "warn": {
    "es6": false,
    "useMathRandom": false
  }
};
```


## akashic-threeの動作内容について

インストール時の次のコマンドの実行時に、Three.jsのアドオンのソースコードを編集しています。

```sh
npx @iwao0/akashic-three
```

具体的には、Three.jsのアドオンは ES Modules形式で書かれているため、akashicで実行可能なCommonJS形式に書き換えています。  
node_modules/three以下のソースコードを直接書き換えているので、問題が起こることがあるかもしれません。  
そうなった時は次のように削除してから再度インストールを行なってください。

```sh
akashic uninstall @iwao0/akashic-three
rm ./akashic-three.json
```

## ビルド方法

**akashic-three** はTypeScriptで書かれたjsモジュールであるため、ビルドにはNode.jsが必要です。

`npm run build` によりビルドできます。

```sh
npm install
npm run build
```

## テスト方法

```sh
npm test
```

## ライセンス
本リポジトリは MIT License の元で公開されています。
詳しくは [LICENSE](./LICENSE) をご覧ください。

[npm]: https://img.shields.io/npm/v/@iwao0/akashic-three
[npm-url]: https://www.npmjs.com/package/@iwao0/akashic-three
