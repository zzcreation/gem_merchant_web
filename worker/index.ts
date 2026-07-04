export default {
  async fetch() {
    return Response.json({
      name: 'gem-merchant-worker',
      status: 'room-worker-scaffold',
    })
  },
}
