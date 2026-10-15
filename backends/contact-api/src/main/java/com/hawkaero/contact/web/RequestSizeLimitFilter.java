package com.hawkaero.contact.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.web.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rejects oversized request bodies: by Content-Length up front (413) and, for chunked
 * requests without a length, by cutting the stream off once the limit is exceeded.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private final long maxBytes;
    private final ObjectMapper mapper;

    public RequestSizeLimitFilter(AppProperties props, ObjectMapper mapper) {
        this.maxBytes = props.request().maxBodyBytes();
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (request.getContentLengthLong() > maxBytes) {
            response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(),
                    ApiError.of("PAYLOAD_TOO_LARGE", "The request is too large."));
            return;
        }
        chain.doFilter(new LimitedRequest(request, maxBytes), response);
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        private final long limit;

        LimitedRequest(HttpServletRequest request, long limit) {
            super(request);
            this.limit = limit;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return new LimitedStream(super.getInputStream(), limit);
        }
    }

    private static final class LimitedStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final long limit;
        private long read;

        LimitedStream(ServletInputStream delegate, long limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            int b = delegate.read();
            if (b >= 0 && ++read > limit) {
                throw new IOException("Request body too large");
            }
            return b;
        }

        @Override
        public int read(byte[] buf, int off, int len) throws IOException {
            int n = delegate.read(buf, off, len);
            if (n > 0) {
                read += n;
                if (read > limit) {
                    throw new IOException("Request body too large");
                }
            }
            return n;
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener listener) {
            delegate.setReadListener(listener);
        }
    }
}
