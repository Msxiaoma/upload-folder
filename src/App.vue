<template>
  <div id="app">
    <upload-folder :url="uploadUrl"></upload-folder>
  </div>
</template>

<script>
import UploadFolder from '@/components/uploadFolder'
export default {
  name: 'App',
  data () {
    return {
      uploadUrl: 'http://courseware.xesv5.com/api/Page/multipartUpload'
    }
  },
  components: {
    UploadFolder
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
