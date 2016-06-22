//----------------------------------------------------------------------------------
// Microsoft Developer & Platform Evangelism
//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, 
// EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES 
// OF MERCHANTABILITY AND/OR FITNESS FOR A PARTICULAR PURPOSE.
//----------------------------------------------------------------------------------
// The example companies, organizations, products, domain names,
// e-mail addresses, logos, people, places, and events depicted
// herein are fictitious.  No association with any real company,
// organization, product, domain name, email address, logo, person,
// places, or events is intended or should be inferred.
//----------------------------------------------------------------------------------

var fs = require('fs');
var util = require('util');
var guid = require('node-uuid');
var crypto = require('crypto');
var storage = require('azure-storage');
var config = require('./config');

function basicSamples() {
  return scenarios = [
    {
      action: basicStorageBlockBlobOperations,
      message: '块blob示例完成\n'
    },
    {
      action: basicStoragePageBlobOperations,
      message: '页blob示例完成\n'
    }
  ];
}

/**
* 块blob基础.
* @ignore
* 
* @param {errorOrResult}        callback                         The callback function.
*/
function basicStorageBlockBlobOperations(callback) {
  // 创建一个blobClient来和连接字符串的blob服务交互
  // 如何配置 Azure 存储空间连接字符串 - https://www.azure.cn/documentation/articles/storage-configure-connection-string/
  var blobService = storage.createBlobService(config.connectionString);

  var imageToUpload = "HelloWorld.png";
  var blockBlobContainerName = "demoblockblobcontainer-" + guid.v1();
  var blockBlobName = "demoblockblob-" + imageToUpload;

  console.log('块blob示例');

  // 创建一个容器来组织存储账号下的blob。
  console.log('1. 创建容器');
  blobService.createContainerIfNotExists(blockBlobContainerName, function (error) {
    if (error) return callback(error);

    // 上传BlockBlob到最新创建的容器中
    console.log('2. 上传 BlockBlob');
    blobService.createBlockBlobFromLocalFile(blockBlobContainerName, blockBlobName, imageToUpload, function (error) {
      if (error) return callback(error);

      // 列出容器内所有的blobs 
      console.log('3. 列出容器内所有的blobs');
      listBlobs(blobService, blockBlobContainerName, null, null, null, function (error, results) {
        if (error) return callback(error);

        for (var i = 0; i < results.length; i++) {
          console.log(util.format('   - %s (type: %s)'), results[i].name, results[i].blobType);
        }

        // 下载blob到您的文件系统
        console.log('4. 下载Blob');
        var downloadedImageName = util.format('CopyOf%s', imageToUpload);
        blobService.getBlobToLocalFile(blockBlobContainerName, blockBlobName, downloadedImageName, function (error) {
          if (error) return callback(error);

          // 创建只读的blob快照
          console.log('5. 创建只读的blob快照');
          blobService.createBlobSnapshot(blockBlobContainerName, blockBlobName, function (error, snapshotId) {
            if (error) return callback(error);

            // 创建3个新的块，然后上传到已经存在的blob中
            console.log('6. 创建3个新的块，然后上传到已经存在的blob中');
            var buffer = getRandomBuffer(1024);
            var blockIds = [];
            var blockCount = 0;
            var blockId = getBlockId(blockCount);
            var uploadBlockCallback = function (error) {
              if (error) return callback(error);

              blockCount++;
              if (blockCount <= 3) {
                blockId = getBlockId(blockCount);
                blockIds.push(blockId);
                blobService.createBlockFromText(blockId, blockBlobContainerName, blockBlobName, buffer, uploadBlockCallback);
              } else {
                // 注意: 清确保您调用了commitBlocks方法，将块提交到blob中
                var blockList = { 'UncommittedBlocks': blockIds };
                blobService.commitBlocks(blockBlobContainerName, blockBlobName, blockList, function (error) {

                  //示例后的清除，删除不必要的blobs，如果您也删除容器的话，下面的代码简单的告诉我们如何做
                  console.log('7. 删除块blob和他的所有快照');
                  var deleteOption = { deleteSnapshots: storage.BlobUtilities.SnapshotDeleteOptions.BLOB_AND_SNAPSHOTS };
                  blobService.deleteBlob(blockBlobContainerName, blockBlobName, deleteOption, function (error) {
                    try { fs.unlinkSync(downloadedImageName); } catch (e) { }
                    if (error) return callback(error);

                    // 删除容器
                    console.log('8. 删除容器');
                    blobService.deleteContainerIfExists(blockBlobContainerName, function (error) {
                      callback(error);
                    });
                  });
                });
              }
            };

            blockIds.push(blockId);
            blobService.createBlockFromText(blockId, blockBlobContainerName, blockBlobName, buffer, uploadBlockCallback);
          });
        });
      });
    });
  });
}

/**
* 页blob基础
* @ignore
* 
* @param {errorOrResult}        callback                         The callback function.
*/
function basicStoragePageBlobOperations(callback) {
  // 创建一个blobClient来和连接字符串的blob服务交互
  // 如何配置 Azure 存储空间连接字符串 - https://www.azure.cn/documentation/articles/storage-configure-connection-string/
  var blobService = storage.createBlobService(config.connectionString);

  var fileToUpload = "HelloPage.dat";
  var pageBlobContainerName = "demopageblobcontainer-" + guid.v1();
  var pageBlobName = "demopageblob-" + fileToUpload;

  console.log('Page Blob 示例');

  // 创建一个容器来组织存储账号下的blobs
  console.log('1. 创建容器');
  blobService.createContainerIfNotExists(pageBlobContainerName, function (error) {
    if (error) return callback(error);

    // 我们有两个选择去查看已经上传的blob 
    // 1) 使用共享访问签名(SAS)来委托访问资源。更多详细内容请阅读上面提供的关于SAS的文档。 
    // 2) 公开容器下blobs的访问权限。取消下面代码的注释可以达到此目的。通过这样的设置我们可以使用下面的链接访问之前上传的图片 
    // https://[存储账号].blob.core.chinacloudapi.cn/demopageblobcontainer-[guid]/demopageblob-HelloPage.dat  

    // 上传PageBlob到最新创建的容器中
    console.log('2. 上传PageBlob');
    blobService.createPageBlobFromLocalFile(pageBlobContainerName, pageBlobName, fileToUpload, function (error) {
      if (error) return callback(error);

      // 列出容器下所有的blobs
      console.log('3. 列出容器下的blobs');
      listBlobs(blobService, pageBlobContainerName, null, null, null, function (error, results) {
        if (error) return callback(error);

        for (var i = 0; i < results.length; i++) {
          console.log(util.format('   - %s (type: %s)'), results[i].name, results[i].blobType);
        }

        // 从page blob的一个范围读取数据
        console.log('4. 从page blob的一个范围读取数据');
        var downloadedFileName = util.format('CopyOf%s', fileToUpload);
        var downloadOptions = { rangeStart: 128, rangeEnd: 255 };
        blobService.getBlobToLocalFile(pageBlobContainerName, pageBlobName, downloadedFileName, downloadOptions, function (error) {
          if (error) return callback(error);

          fs.stat(downloadedFileName, function (error, stats) {
            console.log('   Downloaded File Size: %s', stats.size);
            try { fs.unlinkSync(downloadedFileName); } catch (e) { }

            // 示例后的一些清除工作
            console.log('7. 删除页Blob');
            blobService.deleteBlob(pageBlobContainerName, pageBlobName, function (error) {
              if (error) return callback(error);

              // Delete the container
              console.log('8. 删除容器');
              blobService.deleteContainerIfExists(pageBlobContainerName, function (error) {
                callback(error);
              });
            });
          });
        });
      });
    });
  });
}

/**
* Lists blobs in the container.
* @ignore
*
* @param {BlobService}        blobService                         The blob service client.
* @param {string}             container                           The container name.
* @param {object}             token                               A continuation token returned by a previous listing operation. 
*                                                                 Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                           The request options.
* @param {int}                [options.maxResults]                Specifies the maximum number of directories to return per call to Azure ServiceClient. 
*                                                                 This does NOT affect list size returned by this function. (maximum: 5000)
* @param {LocationMode}       [options.locationMode]              Specifies the location mode used to decide which location the request should be sent to. 
*                                                                 Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]       The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]  The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                 The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                 execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]           A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]         Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                 The default value is false.
* @param {errorOrResult}      callback                            `error` will contain information
*                                                                 if an error occurs; otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                 `entries`  gives a list of directories and the `continuationToken` is used for the next listing operation.
*                                                                 `response` will contain information related to this operation.
*/
function listBlobs(blobService, container, token, options, blobs, callback) {
  blobs = blobs || [];

  blobService.listBlobsSegmented(container, token, options, function (error, result) {
    if (error) return callback(error);

    blobs.push.apply(blobs, result.entries);
    var token = result.continuationToken;
    if (token) {
      console.log('   Received a segment of results. There are ' + result.entries.length + ' blobs on this segment.');
      listBlobs(blobService, container, token, options, blobs, callback);
    } else {
      console.log('  列出容器完成. 共有 ' + blobs.length + ' 个blobs.');
      callback(null, blobs);
    }
  });
}

/**
* Generates a random bytes of buffer.
* @ignore
*
* @param {int}        size                         The size of the buffer in bytes.
* @return {Buffer}
*/
function getRandomBuffer(size) {
  return crypto.randomBytes(size);
}

/**
* Generates a random ID for the blob block.
* @ignore
*
* @param {int}        index                        The index of the block.
* @return {string}
*/
function getBlockId(index) {
  var prefix = zeroPaddingString(Math.random().toString(16), 8);
  return prefix + '-' + zeroPaddingString(index, 6);
}

/**
* Adds paddings to a string.
* @ignore
*
* @param {string}     str                          The input string.
* @param {int}        len                          The length of the string.
* @return {string}
*/
function zeroPaddingString(str, len) {
  var paddingStr = '0000000000' + str;
  if (paddingStr.length < len) {
    return zeroPaddingString(paddingStr, len);
  } else {
    return paddingStr.substr(-1 * len);
  }
}

module.exports = basicSamples();