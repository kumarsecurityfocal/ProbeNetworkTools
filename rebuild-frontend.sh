#!/bin/bash
cd frontend
npm run build -- --outDir=../public
echo "Frontend rebuilt successfully"