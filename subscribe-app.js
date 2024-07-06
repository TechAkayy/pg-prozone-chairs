import {createApp, ref} from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'

// Composition API

const rootComponent = {
  setup() {
    const email = ref('')
    const subscribe = () => {
      console.log(email.value)
    }

    return {
      email,
      subscribe,
    }
  },
}

createApp(rootComponent).mount('form#subscribe-form')
