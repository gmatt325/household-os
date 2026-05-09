#!/bin/bash
cd "$(dirname "$0")"
sleep 2 && open -a Safari http://localhost:5174 &
npm run dev
