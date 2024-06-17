FROM node:20

RUN npm install typescript eslint prettier -g

# Install bun
RUN curl -fsSL https://bun.sh/install | bash

# Install just
WORKDIR /usr/bin
RUN wget https://github.com/casey/just/releases/download/1.26.0/just-1.26.0-x86_64-unknown-linux-musl.tar.gz
RUN tar -xzf just-1.26.0-x86_64-unknown-linux-musl.tar.gz
RUN chmod +x ./just
RUN rm just-1.26.0-x86_64-unknown-linux-musl.tar.gz

WORKDIR /nostr-tools
ENV LANG C.UTF-8

# The run the start script
CMD [ "/bin/bash" ]
