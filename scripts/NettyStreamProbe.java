import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.Unpooled;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

// Isolated replay using Netty's real HTTP compressor and the game's SSE framing.
class NettyStreamProbe {
    public static void main(String[] args) throws Exception {
        List<String> snapshots = Files.readAllLines(Path.of(args[0]));
        EventLoopGroup boss = new NioEventLoopGroup(1), workers = new NioEventLoopGroup(1);
        try {
            Channel server = new ServerBootstrap().group(boss, workers).channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    protected void initChannel(SocketChannel channel) {
                        channel.pipeline().addLast(new HttpServerCodec());
                        channel.pipeline().addLast(new HttpContentCompressor());
                        channel.pipeline().addLast(new HttpObjectAggregator(65536));
                        channel.pipeline().addLast(new SimpleChannelInboundHandler<FullHttpRequest>() {
                            protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) {
                                boolean gzip = request.uri().contains("gzip=true");
                                HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK);
                                response.headers().set("Content-Type", "text/event-stream;charset=UTF-8");
                                response.headers().set("Cache-Control", "no-cache");
                                response.headers().set("Access-Control-Allow-Origin", "*");
                                response.headers().set("Transfer-Encoding", "chunked");
                                // Identity bypasses compression without changing the other pipeline stages.
                                if (!gzip) response.headers().set("Content-Encoding", "identity");
                                ctx.writeAndFlush(response);
                                int[] seq = {0};
                                ScheduledFuture<?> timer = ctx.executor().scheduleAtFixedRate(() -> {
                                    if (seq[0] >= snapshots.size()) return;
                                    String data = "data:{\"type\":\"game-stream\",\"probeSeq\":" + seq[0]
                                        + ",\"probeSent\":" + System.currentTimeMillis()
                                        + ",\"state\":" + snapshots.get(seq[0]++) + "}\n\n";
                                    ctx.writeAndFlush(new DefaultHttpContent(Unpooled.copiedBuffer(data, StandardCharsets.UTF_8)));
                                    if (seq[0] == snapshots.size()) ctx.writeAndFlush(LastHttpContent.EMPTY_LAST_CONTENT);
                                }, 100, 100, TimeUnit.MILLISECONDS);
                                ctx.channel().closeFuture().addListener(done -> timer.cancel(false));
                            }
                        });
                    }
                }).bind("127.0.0.1", Integer.parseInt(args[1])).sync().channel();
            System.out.println("READY " + server.localAddress());
            server.closeFuture().sync();
        } finally {
            workers.shutdownGracefully(); boss.shutdownGracefully();
        }
    }
}
