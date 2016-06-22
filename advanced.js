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

var guid = require('node-uuid');
var util = require('util');
var storage = require('azure-storage');
var config = require('./config');

function advancedSamples() {
  return scenarios = [
    {
      action: leaseBlob,
      message: 'Blob 租约示例完成\n'
    },
    {
      action: leaseContainer,
      message: '容器租约示例完成\n'
    },
    {
      action: setCorsRules,
      message: 'Cors规则示例完成\n'
    },
    {
      action: containerOperations,
      message: '容器示例完成\n'
    },
    {
      action: copyBlob,
      message: '拷贝Blob示例完成\n'
    },
    {
      action: containerOperationsWithSas,
      message: 'SAS操作容器示例完成\n'
    }
  ];
}

function copyBlob(callback) {
  var blobService = storage.createBlobService(config.connectionString);

  var containerName = "demoblobcontainer-" + guid.v1();

  console.log('1. 创建容器');
  blobService.createContainerIfNotExists(containerName, function (error) {
    if (error) return callback(error);

    console.log('2. 创建文本Blob');
    blobService.createBlockBlobFromText(containerName, 'sourceBlob', 'sample data', function (error) {
      if (error) return callback(error);

      var sourceBlobUrl = blobService.getUrl(containerName, 'sourceBlob');

      console.log('3. 拷贝文本Blob');
      blobService.startCopyBlob(sourceBlobUrl, containerName, 'targetBlob', function (error, result) {
        if (error) return callback(error);

        console.log('状态： ' + result.copy.status);

        if (result.copy.status === 'pending') {
          console.log('4. 终止文本BLob的拷贝');

          blobService.abortCopyBlob(containerName, 'targetBlob', result.copy.id, function (error) {
            if (error) callback(error);

            console.log('拷贝操作终止');

            //删除容器
            console.log('5. 删除容器');
            blobService.deleteContainerIfExists(containerName, function (error) {
              callback(error);
            })
          })
        } else {
          //删除容器
          console.log('4. 删除容器');
          blobService.deleteContainerIfExists(containerName, function (error) {
            callback(error);
          })
        }
      })
    })
  });
}

function containerOperations(callback) {
  // 创建一个blobClient来和连接字符串的blob服务交互
  // 如何配置 Azure 存储空间连接字符串 - https://www.azure.cn/documentation/articles/storage-configure-connection-string/
  var blobService = storage.createBlobService(config.connectionString);

  var containerName = "demoblobcontainer-" + guid.v1();

  console.log('1. 创建容器');

  blobService.createContainerIfNotExists(containerName, function (error) {
    if (error) return callback(error);

    // 列出存储账号下所以的容器
    console.log('2. 列出容器');
    listContainers('demoblobcontainer', blobService, null, null, null, function (error, results) {
      if (error) return callback(error);

      for (var i = 0; i < results.length; i++) {
        console.log(util.format('   - %s'), results[i].name);
      }

      //删除容器
      console.log('3. 删除容器');
      blobService.deleteContainerIfExists(containerName, function (error) {
        callback(error);
      });
    });
  });
}

function setCorsRules(callback) {
  // 创建一个blobClient来和连接字符串的blob服务交互
  // 如何配置 Azure 存储空间连接字符串 - https://www.azure.cn/documentation/articles/storage-configure-connection-string/
  var blobService = storage.createBlobService(config.connectionString);

  blobService.getServiceProperties(function (error, properties) {
    if (error) return callback(error);

    var originalCors = properties.Cors;

    properties.Cors = {
      CorsRule: [{
        AllowedOrigins: ['*'],
        AllowedMethods: ['POST', 'GET'],
        AllowedHeaders: ['*'],
        ExposedHeaders: ['*'],
        MaxAgeInSeconds: 3600
      }]
    };

    blobService.setServiceProperties(properties, function (error) {
      if (error) return callback(error);

      // reverts the cors rules back to the original ones so they do not get corrupted by the ones set in this sample
      properties.Cors = originalCors;

      blobService.setServiceProperties(properties, function (error) {
        return callback(error);
      });
    });
  });
}

function leaseContainer(callback) {
  // 创建一个blobClient来和连接字符串的blob服务交互
  // 如何配置 Azure 存储空间连接字符串 - https://www.azure.cn/documentation/articles/storage-configure-connection-string/
  var blobService = storage.createBlobService(config.connectionString);

  var containerName = "demoleaseblobcontainer-" + guid.v1();

  console.log('1. 创建容器');

  blobService.createContainerIfNotExists(containerName, function (error) {
    if (error) return callback(error);

    console.log('2. 获得容器上的租约');
    blobService.acquireLease(containerName, null, { leaseDuration: 15 }, function (error, leaseResult) {
      if (error) return callback(error);

      console.log('3. 没有租约删除容器');
      blobService.deleteContainer(containerName, function (error) {
        if (error) {
          console.log('由于没有指定租约，这个容器不能被删除. ' + error.message);
        }

        console.log('4. 提供租约删除容器 ' + leaseResult.id);
        blobService.deleteContainer(containerName, { leaseId: leaseResult.id }, function (error) {
          return callback(error);
        })
      });
    });
  });
}

function leaseBlob(callback) {
  // Create a blob client for interacting with the blob service from connection string
  // How to create a storage connection string - http://msdn.microsoft.com/en-us/library/azure/ee758697.aspx
  var blobService = storage.createBlobService(config.connectionString);

  var containerName = "demoleaseblobcontainer-" + guid.v1();
  var blobName = 'exclusive';

  console.log('1. 创建容器');
  blobService.createContainerIfNotExists(containerName, function (error) {
    if (error) return callback(error);

    console.log('2. 创建Blob');
    blobService.createBlockBlobFromText(containerName, blobName, 'blob created', function (error) {
      if (error) return callback(error);

      console.log('3. 获得blob上的租约');
      blobService.acquireLease(containerName, blobName, { leaseDuration: 15 }, function (error, leaseResult) {
        if (error) return callback(error);

        console.log('4.没有租约删除Blob');
        blobService.deleteBlob(containerName, blobName, function (error) {
          if (error) {
            console.log('由于没有指定租约，这个Blob不能被删除. ' + error.message);
          }

          console.log('5. 提供租约ID删除Blob ' + leaseResult.id);
          blobService.deleteBlob(containerName, blobName, { leaseId: leaseResult.id }, function (error) {
            if (error) return callback(error);

            console.log('6. 删除容器');
            blobService.deleteContainer(containerName, function (error) {
              return callback(error);
            })
          })
        })
      })
    })
  });
}

function containerOperationsWithSas(callback) {
  var containerName = "demosasblobcontainer-" + guid.v1();
  var blobName = 'blobsas';

  var blobService = storage.createBlobService(config.connectionString);

  console.log('1. 创建容器')
  blobService.createContainerIfNotExists(containerName, function (error) {
    if (error) return callback(error);

    console.log('2. 获取容器的共享访问签名');
    var expiryDate = new Date();

    expiryDate.setMinutes(expiryDate.getMinutes() + 30);

    var sharedAccessPolicy = {
      AccessPolicy: {
        Permissions: storage.BlobUtilities.SharedAccessPermissions.READ +
        storage.BlobUtilities.SharedAccessPermissions.WRITE +
        storage.BlobUtilities.SharedAccessPermissions.DELETE +
        storage.BlobUtilities.SharedAccessPermissions.LIST,
        Expiry: expiryDate
      }
    };

    var sas = blobService.generateSharedAccessSignature(containerName, null, sharedAccessPolicy);

    var sharedBlobService = storage.createBlobServiceWithSas(blobService.host, sas);

    console.log('3. 通过共享访问签名创建blob');
    sharedBlobService.createBlockBlobFromText(containerName, blobName, 'test data', function (error) {
      if (error) return callback(error);

      console.log('4. 通过共享访问签名列出容器下的所有的blob');
      listBlobs(sharedBlobService, containerName, null, null, null, function (error, blobs) {
        if (error) return callback(error);

        console.log('5. 通过共享访问签名删除blob');
        sharedBlobService.deleteBlob(containerName, blobName, function (error) {
          if (error) return callback(error);

          console.log('6. 删除容器');
          blobService.deleteContainer(containerName, function (error) {
            return callback(error);
          })
        })
      })
    })
  });
}

/**
* Lists containers in account.
* @ignore
*
* @param {string}             prefix                              The prefix of the container.
* @param {BlobService}        blobService                         The blob service client.
* @param {object}             token                               A continuation token returned by a previous listing operation. 
*                                                                 Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                           The request options.
* @param {LocationMode}       [options.locationMode]                      Specifies the location mode used to decide which location the request should be sent to. 
*                                                                         Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.maxResults]                        Specifies the maximum number of containers to return per call to Azure storage.
* @param {string}             [options.include]                           Include this parameter to specify that the container's metadata be returned as part of the response body. (allowed values: '', 'metadata')
*                                                                         **Note** that all metadata names returned from the server will be converted to lower case by NodeJS itself as metadata is set via HTTP headers and HTTP header names are case insensitive.
* @param {int}                [options.timeoutIntervalInMs]               The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]          The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                         The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                         execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                   A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                 Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                         The default value is false.
* @param {errorOrResult}      callback                                    `error` will contain information
*                                                                         if an error occurs; otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                         `entries`  gives a list of `[containers]{@link ContainerResult}` and the `continuationToken` is used for the next listing operation.
*                                                                         `response` will contain information related to this operation.
*/
function listContainers(prefix, blobService, token, options, containers, callback) {
  containers = containers || [];

  blobService.listContainersSegmentedWithPrefix(prefix, token, options, function (error, result) {
    if (error) return callback(error);

    containers.push.apply(containers, result.entries);
    var token = result.continuationToken;
    if (token) {
      console.log('   接受这个片段的结果. 共有 ' + result.entries.length + ' 个容器在这个片段中.');
      listContainers(prefix, blobService, token, options, containers, callback);
    } else {
      console.log('   列出操作完成. 共有 ' + containers.length + ' 个容器.');
      callback(null, containers);
    }
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
      console.log('   接受这个片段的结果. 共有 ' + result.entries.length + ' 个容器在这个片段中.');     
      listBlobs(blobService, container, token, options, blobs, callback);
    } else {
      console.log('   列出操作完成. 共有 ' + blobs.length + ' 个容器.'); 
      callback(null, blobs);
    }
  });
}

module.exports = advancedSamples();
