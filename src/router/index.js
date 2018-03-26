import Vue from 'vue'
import Router from 'vue-router'
import UploadFolder from '@/components/uploadFolder'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'uploadFolder',
      component: UploadFolder
    }
  ]
})
