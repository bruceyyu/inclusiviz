#!/bin/bash

# Activate Conda environment
source activate inclusiviz
cd ./deepgravity

# Repeat the command 4 times
group_list=("Under \$50K" "\$50K - \$100K" "\$100K - \$200K" "Over \$200K")
# group_list=("Lean Democrat" "Lean Republican")
# group_list=("white" "asian" "black" "hispanic")
# group_list=("all")

for group in "${group_list[@]}"
do
    for round in {1..5}
    do
        for i in {0..1}
        do
            python main.py --dataset houston \
                           --oa-id-column GEOID \
                           --flow-origin-column geoid_o \
                           --flow-destination-column geoid_d \
                           --flow-flows-column pop_flows \
                           --tessellation-area Houston \
                           --tessellation-size 1500 \
                           --epochs 20 \
                           --batch-size 16 \
                           --device gpu \
                           --mode train \
                           --recalculate-data 1 \
                           --selected-subgroup-cate "$group" \
                           --experiment-visitors ${i} \
                           --experiment-round ${round}
        done
    done
done

conda deactivate
