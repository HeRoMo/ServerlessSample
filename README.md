# My First Serverless service

[Serverless Framework](https://serverless.com/)の調査・学習のためのプロジェクト。

参考：[Serverless \- AWS Documentation](https://serverless.com/framework/docs/providers/aws/)

## 準備
### Githubの設定
ビルドの対象となるリポジトリをGithubに作成する。
リポジトリのサンプルは [こちら](https://github.com/HeRoMo/Test)

Githubの Amazon SNSとの連携は手動で実施する。
このプロジェクトをデプロイするとSNSトピック `pull_request_dispatch` がAWSに追加される。それをGithubリポジトリの設定の *Integrations & services* からサービスとして追加する。

この時点では、`push` イベントのみの通知される。
GithubのAPIを使って、`pull_request` イベントを追加する必要がある。不要なら `push` イベントを削除する。

** 手順 **

1. [List hooks](https://developer.github.com/v3/repos/hooks/#list-hooks) APIで対象となる hookのIDを取得する
  ```
  $ curl -u '<ユーザ名>' https://api.github.com/repos/<Repoユーザ名>/<Repo名>/hooks
  ```
2. [Edit a hook](https://developer.github.com/v3/repos/hooks/#edit-a-hook) APIで受信するイベントを変更する。
  ```
  curl -u '<ユーザ名>' https://api.github.com/repos/<Repoユーザ名>/<Repo名>/hooks/<HookのID> -H 'content-type: application/json' -d '{ "add_events": ["pull_request"] }'
  curl -u '<ユーザ名>' https://api.github.com/repos/<Repoユーザ名>/<Repo名>/hooks/<HookのID> -H 'content-type: application/json' -d '{ "remove_events": ["push"]}'
  ```

Githubのトークンやリポジトリ名をCONFIG.ymlに設定する。

### CodeBuild プロジェクトの作成
このLambda関数が実行しようとする CodeBuild プロジェクトを作成しておく。
作成したプロジェクト名を CONFIG.yml に設定する。

### CloudWatch Eventsの設定
CloudWatch Eventの設定は手動で行う。
（この設定はServerless Framework でできそうなのだが...）。

CloudWatch EventのWebコンソールで *ルールの作成* を選択して、次を設定する。

- **インベントパターン** にチェック
- サービス名： **CodeBuild**
- イベントタイプ: **CodeBuild Build State Change**
- 任意の状態をチェック
- ターゲットは **Lambda関数** を選択して、`my-service-dev-codebuild` を選択する。その他はデフォルトのままでOK

### Slack
Webhook の設定をしておく。
そのURLは CONDIG.ymlに設定する。

## Functions
### pull_request.js

GithubのPullRequestの作成、PRへのPushを Amazon SNSで受け、SNSをトリガーに実行される。

処理内容は次の通り。
- Pull Requestへの通知かどうかを判定
- PR作成(action:opened) or PRへのpush(action:synchronize)の場合
  - GIthub Pull Request の status を `penging` にセット
  - CodeBuild のビルドを開始（ユニットテストを想定）
  - スラックへの通知
- （結局使っていないが、他のLambda関数の実行コードも実装している）

### codebuild.js

コードビルドの実行を CloudWatch Event で監視して、ステータスの変更イベントでトリガーする。

処理内容は次の通り。
- CloudWatch Eventからのトリガーで起動
- `SUCCEEDED`,`FAILED`の場合、Githubにその結果を通知。PRの状態を更新する
- Slackにも通知する。

## License
MIT
