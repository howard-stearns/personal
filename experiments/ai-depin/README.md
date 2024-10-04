# DePIn'd AI

> This is what I propose to _try_ to do. I have not done it yet, and I don't know that I can. I don't even know that my descriptions here are correct.

This proof-of-concept allows any compatabile (PyToch) LLM AI model to run inference on a network of contributed machines. Specifically, it supports very large models such as Meta's Llama 3 405B, which are too large to fit on the available graphics cards -- as long as each _layer_ of the model can fit on one of the GPUs.

Demo TBD, and you can contribute computing resources by following the instructions at TBD.

### Terms:

A _Large Langue Model_ (LLM) is a particular sequence of formulae using matrix computations (code), together with a huge set of numbers used in that formula (data). A _layer_ is one of the constituent formula+data.

_Inference_ means running the LLM on inputs to generate a response.

_Training_ means to derive that original data experimentally by performing inference on a huge nubmer of examples, and adjusting the internal data to match.

A _Graphics Processing Unit_ (GPU) is specialized hardware built-in or added to a computer that greatly accelerates computations involving large matrices. While the computation itself is very fast, it still takes a a bit of time to transfer the data between the CPU RAM and GPU VRAM.

_[PyTorch](https://pytorch.org/)_ is a large library of [Python](https://www.python.org/) utilities for defining, training, and running inferences on LLMs. Many open models use this, as do additional libraries such as Huggingface. PyTorch defines platform-independent high-level Python scripting abstractions around lower-level hardware-specific implementations of these abstractions.

_Model Parallelism_ is the term for the distribution of parts of an LLM over multiple processing units, which is what this Proof-of-Concept (PoC) does.

## Limitations and Potential Future Work

**Accounting:** There is nothing here to credit those who contribute work in a correct and timely way, discredit those who do not, debit those who run inference queries, nor to produce any other metrics on how the system is being used or failing.

**Latency:** Software that re-uses smaller hardware needs to load and reload the matrices during an inference, which makes the inference take longer. Our system avoids that by loading different matrices onto different machines once, and then running several inferences on that without reloading the data. However, there are still intermediate results between layers that need to be transfered not just from VRAM to RAM, but across the network to RAM on another machine. The good news is that networks are quite fast (e.g., compared to disks even on a local machine), and that the amount of such data is much much smaller than the model data. Remaining negative effects can still be improved by data compaction and careful coordination of operations so that machines are not idle (called pipelining).

**Breaking up layers:** Each layer of the model consists of a number of operations on large matrices, and currently, these must fit into GPU VRAM. In principle, the operations can be decomposed into a larger set of operations on smaller matrices, at the cost of adding more latency. Doing so is outside my mathematical skill set -- and particularly so for _training_, which requires tracking of matrix operations in a way that the existing training software can compute the reverse gradient of prediction error with respect to each weight. Maybe someone will create (or has already created) PyTorch extensions for this.

**Training:** The work done for inference is a subset of the work done for training, so in principle, handling training is "just more work". It's even possible that the PyTorch abstractions are designed in such a way that at least some training regimens will just work. Training may require pulling more data from the GPU which in our case will increase latency disproportionately, because the data must then be neworked. Fortunately, the latency of the current implementation is likely irrelevant for training.

**Access:** Although the UI is on the Web, the worker node software must be installed, and there is a lot to install.

- Packaging this for easier installation is a fairly small task, but necessary. (The _current_ process and documentation for the code and data from Meta is incomplete, inconsistent, and just generally not professional grade.)
- Allowing resources to be contributed entirely through the Web is a very large task. In principle, Web standards give us everything needed, but the difficulty is in porting the required parts of PyTorch to the browser.

## Implementation

[Accelerate](https://huggingface.co/docs/accelerate/en/usage_guides/big_modeling) and other libraries run inference one layer at a time, using the hooks provided by PyTorch inference and device abstractions. There appears to be similar hooks built into Llama3. This PoC creates abstractions for _virtual remote_ devices that plugs into this mechanism.

Contributed resources can come and go at any time, and the implementation robustly deals with this.

- Each virtual device is a persistent session in the cloud. Each contributed resource gets assigned to one of these, such that there is ideally at least one physical participant for each virtual-device session. Identifiers for the layer data and formula form the ongoing persistent state of the session (along with any current request in progress), and each new computing participant uses this to build a functioning copy of the layer on joining. When asked to operate on inputs, each of the one or more participants computes the result. Either the first answer is used, or answers can be compared, depending on the accounting setup. If there are no active participants, the computation stalls until one is available, but does not fail.
- Each overall query has state as the computation winds its way through the layers. There are one or more virtual query sessions (depending on pipelining) that keep the state of any proposed queries that have not completed. One or more contributed resources are assigned to a virtual query session, which executes by requests that are made to the necessary virtual remote devices. (When a query participant joins a virtual device session, it does not model the layer, nor respond to requests. Thus it needs only "working" memory.)
- The demo page itself joins a virtual query session, but only offers and displays queries, rather than participating in executing any model inference queries.

Both kinds of session are modeled in [Croquet](https://croquet.io/), and we use the [MultiSync](https://multisynq.io/) infrastructure for generic Croquet networking and session persistence. Note that the _demo TBD_ uses static GitHub Pages, with no application-specific server involved at all. The contributed (device and query) resources interact with this through a local [NodeJS](https://nodejs.org/) Croquet process, and the Web page interacts through a Croquet process directly in the browser.

## Risks

> The intent is that everything from here down disappears as the PoC gets built.

1. The big Llama 3 405B model might not be compatible with any part of this, nor even the smaller Llama 3 models.
2. There might not be enough hooks in the PyToch device modeling, or Accelerate (and alternatives) might not be compatible with such hooks.
3. It might be too slow.
4. Even the layers of the big models might be too big.
5. It might be too hard or too expensive to get suitable resources into the network.

Checklist:

- [x] Run basic PyTorch models locally. 6+ second inference on my Intel Mac laptop (and > 1m training).
- [ ] Run smaller Llama 3 models locally. (Note run time.)
- [ ] Run them locally with accelerate. (Note run time.)
- [ ] Create a single virtual remote device, and run an accelerate-powered Llama 3 model with it. (Note run time.)
- [ ] Run that through Croquet
- [ ] Multiple distinct virtual remote devices.
- [ ] Create a Croquet query model.
- [ ] Increase model size to the largest that can be done with household machines. (Adjust quantization size as necessary. Note run time.)
- [ ] Use rented cloud VMs to run queries through the big 405B model. (Note run time.)	
