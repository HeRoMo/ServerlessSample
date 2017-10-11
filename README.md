# My First Serverless

[Serverless \- The Serverless Application Framework powered by AWS Lambda and API Gateway](https://serverless.com/)の調査・学習のためのプロジェクト。

参考：[Serverless \- AWS Documentation](https://serverless.com/framework/docs/providers/aws/)


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

#### Githubの設定
Githubの Amazon SNSとの連携は手動で実施する。
このプロジェクトをデプロイすると作成されるSNSトピック `pull_request_dispatch` をGithubリポジトリの設定の *Integrations & services* からサービスとして追加する。

この時点では、`push` アクションのみの通知される。
GithubのAPIを使って、`pull_request` イベントを追加する必要がある。不要なら `push` イベントを削除する。

** 手順 **

1. [List hooks](https://developer.github.com/v3/repos/hooks/#list-hooks) APIで対象となる hookのIDを取得する
  ```
  curl -X GET \
    https://api.github.com/repos/HeRoMo/Test/hooks \
    -H 'authorization: Basic <ユーザ名:パスワードのBease64>' \
  ```
2. [Edit a hook](https://developer.github.com/v3/repos/hooks/#edit-a-hook) APIで受信するイベントを変更する。
  ```
  curl -X PATCH \
    https://api.github.com/repos/<Repoユーザ名>/<Repo名>/hooks/<HookのID> \
    -H 'authorization: Basic <ユーザ名:パスワードのBease64>' \
    -H 'content-type: application/json' \
    -d '{
    "add_events": ["pull_request"]
  }'
  ```

### codebuild.js

コードビルドの実行を CloudWatch Event で監視して、ステータスの変更イベントでトリガーする。

CloudWatch Eventの設定は手動で行う。
CloudWatch EventのWebコンソールで *ルールの作成* を選択して、次を設定する

- **インベントパターン** にチェック
- サービス名： **CodeBuild**
- イベントタイプ: **CodeBuild Build State Change**
- 任意の状態をチェック
- ターゲットは **Lambda関数** を選択して、`my-service-dev-codebuild` を選択する。その他はデフォルトのままでOK
