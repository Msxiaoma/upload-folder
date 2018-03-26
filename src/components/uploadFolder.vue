<template>
  <div class="">
    <div class="box-header with-border">
      <h3 class="box-title">拖拽批量上传文件夹</h3>
    </div>
    <div class="box-body">
      <div  class=" upload-dragger" :class="{'drop-stat':dropStat===1}" @dragover="changeDropStat" @drop="dropFolders">
        <div class="upload-tip">将文件拖到此处</div>
        <!-- 上传的文件夹样式 -->
        <div class="selected-folder" v-for="(item,index) in folders" :key="index">
          <img src="../assets/folder.png">
          <i class="el-icon-circle-close-outline delete-folder" @click="deleteCurFolder(index,item)"></i>
          <span class="selected-folder-name">{{item.name}}</span>
          <el-progress :percentage="item.process"></el-progress>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
          <button @click="batchUpload">全部上传</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  props: {
    url: String
  },
  data () {
    return {
      chunkList: [], // 分块列表
      chunk: {},
      fileItem: {},
      filesList: [],
      dropStat: 0, // 拖拽框的状态
      folders: [], // 文件夹列表
      chunkResourceId: '', // 资源唯一ID
      uploadId: '', // 上传Id
      complete: 0 // 1为上传完成的标识,
    }
  },
  methods: {
    deleteCurFolder (index, item) {
      this.$confirm('确定要删除文件夹「' + item.name + '」吗？', {
        center: true
      }).then(() => {
        this.filesList = this.filesList.filter(obj => {
          if (item.id !== obj.attr) {
            return obj
          }
        })
        this.folders.splice(index, 1)
      })
    },
    changeDropStat (e) {
      e.stopPropagation()
      e.preventDefault()
      this.dropStat = 1
    },
    dropFolders (e) {
      e.stopPropagation()
      e.preventDefault()
      var items = e.dataTransfer.items
      for (var i = 0; i < items.length; i++) {
        var item = items[i].webkitGetAsEntry()
        if (item) {
          this.checkFolders(item)
        }
      }
    },
    // 判断是否为文件夹
    checkFolders (item) {
      if (item.isDirectory) {
        this.traverseFileTree(item)
      } else {
        this.$alert('只支持上传文件夹', '提示', {
          confirmButtonText: '确定'
        })
      }
    },
    traverseFileTree (item, path, parentDir) {
      path = path || ''
      if (item.isFile) {
        item.file((file) => {
          if (file.name !== '.DS_Store') {
            let obj = {
              file: file,
              path: path + file.name,
              attr: item.attr
            }
            this.filesList.push(obj)
          }
        })
      } else if (item.isDirectory) {
        var dirReader = item.createReader()
        dirReader.readEntries((entries) => {
          entries = this.filterStore(entries)
          var temp = this.filterFolder(item, entries.length, parentDir)
          for (let i = 0; i < entries.length; i++) {
            entries[i].attr = item.attr
            this.traverseFileTree(entries[i], path + item.name + '/', temp)
          }
        }, function (e) {
          console.log(e)
        })
      }
    },
    // 过滤调Mac默认的.DS_Store文件
    filterStore (arr) {
      let entries = arr.filter(item => {
        return item.name !== '.DS_Store'
      })
      return entries
    },
    // 过滤子文件夹名称
    filterFolder (item, length, parentDir) {
      // 没有子文件夹
      if (item.fullPath.lastIndexOf('/') === 0) {
        if (length === 0) {
          this.$alert('不允许上传空文件夹', '提示', {
            confirmButtonText: '确定'
          })
        } else {
          let temp = {
            id: this.folders.length,
            name: item.name,
            process: 0,
            total: length
          }
          item.attr = this.folders.length
          if (this.folders.length < 30) {
            this.folders.push(temp)
          } else {
            this.$alert('一次只能拖拽30个文件夹', '提示', {
              confirmButtonText: '确定'
            })
          }
          return temp
        }
      }
      if (parentDir) {
        parentDir.total += length - 1
      }
    },
    // 批量上传
    batchUpload () {
      if (this.filesList.length === 0) {
        this.$alert('请先选择要上传的文件夹', '提示', {
          confirmButtonText: '确定'
        })
      } else {
        axios.post(this.url).then((res) => {
          this.fileItem = this.filesList.shift()
          this.uploadFolderItem()
        })
      }
    },
    // 每个文件一次上传
    uploadFolderItem () {
      let bytesPerPiece = 5 * 1024 * 1024 // 每个文件切片大小定为5MB
      let initFileSize = 0 // 初始文件大小
      let curFileSize = 0 // 当前文件的大小
      let curIndex = 1 // 当前块数
      let totalPieces = 0 // 总片数
      if (this.fileItem.file.size > bytesPerPiece) { // 大于1M的文件进行分片
        totalPieces = Math.ceil(this.fileItem.file.size / bytesPerPiece)
        while (initFileSize < this.fileItem.file.size) {
          if (curIndex > totalPieces) {
            return false
          }
          curFileSize = initFileSize + bytesPerPiece
          let chunkItem = this.fileItem.file.slice(initFileSize, curFileSize)
          let sliceIndex = curIndex
          let formData = this.formatData(this.fileItem.path, totalPieces, sliceIndex, '', chunkItem, this.fileItem.attr + 1)
          this.chunkList.push(formData)
          initFileSize = curFileSize
          curFileSize = initFileSize + bytesPerPiece
          if (curFileSize > this.fileItem.file.size) {
            curFileSize = this.fileItem.file.size
          }
          curIndex++
        }
        this.fileItem.total = this.chunkList.length
        // 开始调用分片函数，isFlag = true 分片上传
        this.chunk = this.chunkList.shift()
        this.uploadFolders(this.chunk, true, this.fileItem)
      } else {
        let formData = this.formatData(this.fileItem.path, 1, 1, '', this.fileItem.file, this.fileItem.attr + 1)
        this.uploadFolders(formData, false, this.fileItem)
      }
    },
    // form 表单需要传的数据
    formatData (name, allpart, curpart, multiName, uploadId, attr) {
      let formData = new FormData()
      formData.append('name', name)
      formData.append('allPart', allpart) // 总片数
      formData.append('curPart', curpart) // 当前是第几片
      formData.append('uploadId', uploadId) // 上传ID
      formData.append('multiName', multiName)
      formData.append('attr', attr)
      return formData
    },
    // 上传接口
    uploadFolders (formData, isFlag, everyFile) {
      let config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
      // 分片上传
      if (isFlag) {
        axios.post('/Page/multipartUpload', formData, config).then((res) => {
          if (res.data.status === 100) {
            if (res.data.data.hasOwnProperty('resourceId') && res.data.data.hasOwnProperty('uploadId')) {
              if (!this.chunkList.length) {
                this.chunkResourceId = res.data.data.resourceId
                this.chunk = this.chunkList.shift()
                this.chunk.set('uploadId', res.data.data.uploadId)
                this.chunk.set('resourceId', this.chunkResourceId)
                this.computedProcess(everyFile, true)
                this.uploadFolders(this.chunk, true, everyFile)
              }
            } else {
              if (!this.filesList.length) {
                this.computedProcess(everyFile, true)
                this.fileItem = this.filesList.shift()
                this.uploadFolderItem()
              } else {
                this.computedProcess(everyFile, true)
                this.complete = 1
                this.folders = []
              }
            }
          } else {
            this.$alert(res.data.data, '提示', {
              confirmButtonText: '确定'
            })
          }
        })
        // 不分片上传
      } else {
        axios.post('/Page/multipartUpload', formData, config).then((res) => {
          if (res.data.status === 100) {
            if (!this.filesList.length) {
              this.chunkResourceId = res.data.data.resourceId
              this.computedProcess(everyFile, false)
              this.fileItem = this.filesList.shift()
              this.uploadFolderItem()
            } else {
              this.computedProcess(everyFile, false)
              this.complete = 1
              this.folders = []
            }
          } else {
            this.$alert(res.data.data, '提示', {
              confirmButtonText: '确定'
            })
          }
        })
      }
    },
    // 计算进度条  isdivided 说明是否分片
    computedProcess (everyFile, isdivided) {
      this.folders.forEach((item, index) => {
        if (item.id === everyFile.attr) {
          // 分片
          if (isdivided) {
            if (item.process < 100) {
              item.process += (1 / everyFile.total) / item.total * 100
            }
            if (item.process >= 100) {
              item.process = 100
              this.folders.splice(index, 1)
            }
            // 不分片
          } else {
            if (item.process < 100) {
              item.process += 1 / item.total * 100
            }
            if (item.process >= 100) {
              item.process = 100
              this.folders.splice(index, 1)
            }
          }
        }
      })
    }
  }
}
</script>

<style lang="css">
button {
  color: #409eff;
  background: #ecf5ff;
  border-color: #b3d8ff;
  font-weight: 600;
  outline: 0px;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 13px;
  border-radius: 4px;
  width: 80px;
  margin: 10px;
}

.el-progress__text {
  color: #fff !important;
}

.upload-dragger {
  margin: 40px auto;
  background-color: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  height: 180px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 800px;
}

.drop-stat {
  border-color: #409eff;
}

.selected-folder {
  float: left;
  top: 10px;
  margin: 10px 30px;
  z-index: 99;
  font-size: 12px;
  text-align: center;
}

.selected-folder-name {
  display: block;
}

.upload-tip {
  position: absolute;
  margin: 0px auto;
  display: block;
  top: 70px;
  left: 45%;
  color: #9e9e9e;
  text-align: center;
}

.el-progress-bar {
  padding-right: 0px !important;
  width: 100%;
  margin-right: 0px !important;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}

.el-progress {
  position: relative;
  line-height: 1;
  width: 80px;
  margin: 0px auto;
  /* text-align: center; */
}

.el-progress__text {
  display: none !important;
}

.delete-folder {
  position: relative;
  top: -12px;
  left: -4px;
  color: #9e9e9e;
  cursor: pointer;
}

.delete-folder:hover {
  color: #333;
}
</style>
