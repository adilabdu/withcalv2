import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WithcalView from '../views/WithcalView.vue'
import SalcalView from '../views/SalcalView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/withcal',
      name: 'withcal',
      component: WithcalView,
    },
    {
      path: '/salcal',
      name: 'salcal',
      component: SalcalView,
    },
  ],
})

export default router
