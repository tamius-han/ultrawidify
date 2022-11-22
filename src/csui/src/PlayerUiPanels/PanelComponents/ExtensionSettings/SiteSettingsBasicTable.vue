<template>
  <table>
    <thead>
      <tr>
        <th>Site</th>
        <th>Status</th>
        <th>Crop</th>
        <th>Persist crop</th>
        <th>Stretch</th>
        <th>FS only</th>
        <th>AARD FS only</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="site in settings.active.sites" :key="site">
        <tr>
          <!-- host -->                 <td>{{site}}</td>
          <!-- official status? -->     <td>{{settings.active.sites[site].type}}</td>
          <!-- enabled? -->             <td>todo: add</td>
          <!-- full screen only? -->    <td>{{settings.active.sites[site].restrictions?.fullScreenOnly}}</td>
          <!--  -->
        </tr>
      </template>
    </tbody>
  </table>
</template>
<script>
export default {
  data() {

  },
  props: [
    'settings',
  ],
  components: {

  },

}
</script>
