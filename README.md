---
services: storage
platforms: nodejs
author: yaxia
---

# Node.js中使用Azure Blob服务的起步 

演示如何使用Blob存储服务，Blob存储主要是用来存储一些非结构化的数据，例如：文本、二进制数据、文档、媒体文件。Blob能够通过HTTP或者HTTPS的方式从世界各地访问。

如果您还没有Azure订阅，请点击[此处](/pricing/1rmb-trial)申请试用的订阅账号。


## 运行这个示例

这个示例可以在Azure存储模拟器（存储模拟器是Azure SDK安装的一部分）上运行，这种场景只适合在Windows操作系统 - 或者通过更新app.config文档中的存储账号存储密钥的方式来使用。 
   
使用Azure存储模拟器运行该示例（默认方式）

1. 下载并安装Azure存储模拟器，[下载地址](/downloads) 
2. 点击开始按钮或者Windows键，然后输入"Azure Storage Emulator"找到存储模拟器，点击运行。
3. 打开app.config文件。然后设置配置模拟器("useDevelopmentStorage":true)。
4. 通过`node ./blobSamples.js`运行示例。

使用Azure存储服务来运行这个示例

1. 打开app.config文件, 设置使用模拟器的连接字符串("useDevelopmentStorage":false)，然后设置使用存储服务的连接字符串("connectionString":"...")
2. 在Azure门户网站上创建存储账号。
3. 在app.config文件中提供使用您存储服务的连接字符串("connectionString":"...")。例如：在中国版Azure中此处是"connectionString": "DefaultEndpointsProtocol=https/http;AccountName=<存储账号>;AccountKey=<存储密钥>;BlobEndpoint=<存储blob的终结点>"。
4. 通过`node ./blobSamples.js`运行示例。

## 参考文档

- [什么是存储账号](/documentation/articles/storage-create-storage-account)
- [Blob起步](/documentation/articles/storage-nodejs-how-to-use-blob-storage/)
- [Blob服务概念](https://msdn.microsoft.com/zh-cn/library/dd179376.aspx) 
- [Blob服务REST API](http://msdn.microsoft.com/zh-cn/library/dd135733.aspx)
- [Blob Service Node API](http://azure.github.io/azure-storage-node/BlobService.html)
- [使用共享访问签名(SAS)委托访问](/documentation/articles/storage-dotnet-shared-access-signature-part-1)
- [存储模拟器](/documentation/articles/storage-use-emulator)

